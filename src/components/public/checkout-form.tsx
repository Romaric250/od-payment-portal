"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { checkoutSchema, type CheckoutInput } from "@/lib/validators";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CheckoutFormProps {
  category: {
    slug: string;
    name: string;
    price: number;
  };
}

export function CheckoutForm({ category }: CheckoutFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      categorySlug: category.slug,
      network: "MTN",
    },
  });

  const network = watch("network");

  async function onSubmit(data: CheckoutInput) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error ?? "Payment failed");
      }

      if (!result.link) {
        throw new Error("Payment link was not returned. Please try again.");
      }

      // Redirect to Fapshi hosted checkout
      window.location.href = result.link;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Checkout</CardTitle>
        <p className="text-sm text-od-text-muted">
          Amount: <span className="font-semibold text-od-navy">{formatCurrency(category.price)}</span>
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="payerName">Full name</Label>
            <Input id="payerName" {...register("payerName")} />
            {errors.payerName && (
              <p className="text-sm text-od-error">{errors.payerName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="payerEmail">Email</Label>
            <Input id="payerEmail" type="email" {...register("payerEmail")} />
            {errors.payerEmail && (
              <p className="text-sm text-od-error">{errors.payerEmail.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="payerPhone">Mobile Money number</Label>
            <Input
              id="payerPhone"
              placeholder="670000000"
              {...register("payerPhone")}
            />
            {errors.payerPhone && (
              <p className="text-sm text-od-error">{errors.payerPhone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Network</Label>
            <Select
              value={network}
              onValueChange={(value: "MTN" | "ORANGE") =>
                setValue("network", value, { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select network" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MTN">MTN Mobile Money</SelectItem>
                <SelectItem value="ORANGE">Orange Money</SelectItem>
              </SelectContent>
            </Select>
            {errors.network && (
              <p className="text-sm text-od-error">{errors.network.message}</p>
            )}
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-od-error">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Redirecting..." : "Pay Now"}
          </Button>

          <p className="text-xs text-od-text-muted">
            You will be redirected to Fapshi&apos;s secure checkout page to complete
            your payment via MTN Mobile Money or Orange Money.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
