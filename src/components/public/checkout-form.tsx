"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";
import { TSHIRT_QUANTITY_KEY } from "@/lib/forms";
import { DynamicFormFields, type PublicFormField } from "@/components/public/dynamic-form-fields";
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
    categoryType?: string;
    allowCustomAmount?: boolean;
    minimumAmount?: number | null;
    formFields?: PublicFormField[];
  };
}

export function CheckoutForm({ category }: CheckoutFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const [useCustomPayment, setUseCustomPayment] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [formResponses, setFormResponses] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [payerName, setPayerName] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [network, setNetwork] = useState<"MTN" | "ORANGE">("MTN");

  const quantityField = category.formFields?.find((f) => f.affectsPrice);
  const hasBuiltInQuantity =
    category.categoryType === "TSHIRT" && !quantityField;

  const effectiveQuantity = useMemo(() => {
    if (quantityField) {
      const qty = parseInt(formResponses[quantityField.key] ?? "1", 10);
      return Number.isFinite(qty) && qty >= 1 ? qty : 1;
    }
    if (hasBuiltInQuantity) {
      const qty = parseInt(quantity, 10);
      return Number.isFinite(qty) && qty >= 1 ? qty : 1;
    }
    return 1;
  }, [formResponses, hasBuiltInQuantity, quantity, quantityField]);

  const standardAmount = category.price * effectiveQuantity;

  const computedAmount = useMemo(() => {
    if (category.allowCustomAmount && useCustomPayment) {
      const amount = parseInt(customAmount, 10);
      return Number.isFinite(amount) ? amount : null;
    }
    return standardAmount;
  }, [
    category.allowCustomAmount,
    customAmount,
    standardAmount,
    useCustomPayment,
  ]);

  function updateFormResponse(key: string, value: string) {
    setFormResponses((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function submitPayment(payload: Record<string, unknown>) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error ?? "Payment failed");
      }

      if (!result.link) {
        throw new Error("Payment link was not returned. Please try again.");
      }

      window.location.href = result.link;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const nextErrors: Record<string, string> = {};
    if (!payerName.trim()) nextErrors.payerName = "Name is required";
    if (!payerEmail.trim()) nextErrors.payerEmail = "Email is required";
    if (!payerPhone.trim()) nextErrors.payerPhone = "Phone number is required";

    for (const field of category.formFields ?? []) {
      if (field.affectsPrice) continue;
      const value = formResponses[field.key]?.trim() ?? "";
      if (field.required && !value) {
        nextErrors[field.key] = `${field.label} is required`;
      }
    }

    if (quantityField) {
      const qty = parseInt(formResponses[quantityField.key] ?? "", 10);
      if (!Number.isFinite(qty) || qty < 1) {
        nextErrors[quantityField.key] = `${quantityField.label} must be at least 1`;
      }
    } else if (hasBuiltInQuantity) {
      const qty = parseInt(quantity, 10);
      if (!Number.isFinite(qty) || qty < 1) {
        nextErrors.quantity = "Quantity must be at least 1";
      }
    }

    if (category.allowCustomAmount && useCustomPayment) {
      const amount = parseInt(customAmount, 10);
      const min = category.minimumAmount ?? 100;
      if (!Number.isFinite(amount) || amount < min) {
        setError(`Minimum custom amount is ${formatCurrency(min)}`);
        return;
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    const responses: Record<string, string> = { ...formResponses };
    if (hasBuiltInQuantity) {
      responses[TSHIRT_QUANTITY_KEY] = String(effectiveQuantity);
    }

    await submitPayment({
      categorySlug: category.slug,
      network,
      payerName: payerName.trim(),
      payerEmail: payerEmail.trim(),
      payerPhone: payerPhone.trim(),
      formResponses: responses,
      ...(hasBuiltInQuantity && !category.formFields?.length
        ? { quantity: effectiveQuantity }
        : {}),
      ...(category.allowCustomAmount && useCustomPayment
        ? { customAmount: parseInt(customAmount, 10) }
        : {}),
    });
  }

  const customFormFields =
    category.formFields?.filter((field) => !field.affectsPrice) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Checkout</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="payerName">Full name</Label>
            <Input
              id="payerName"
              value={payerName}
              onChange={(e) => {
                setPayerName(e.target.value);
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.payerName;
                  return next;
                });
              }}
            />
            {fieldErrors.payerName && (
              <p className="text-sm text-od-error">{fieldErrors.payerName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="payerEmail">Email</Label>
            <Input
              id="payerEmail"
              type="email"
              value={payerEmail}
              onChange={(e) => {
                setPayerEmail(e.target.value);
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.payerEmail;
                  return next;
                });
              }}
            />
            {fieldErrors.payerEmail && (
              <p className="text-sm text-od-error">{fieldErrors.payerEmail}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="payerPhone">Mobile Money number</Label>
            <Input
              id="payerPhone"
              placeholder="670000000"
              value={payerPhone}
              onChange={(e) => {
                setPayerPhone(e.target.value);
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.payerPhone;
                  return next;
                });
              }}
            />
            {fieldErrors.payerPhone && (
              <p className="text-sm text-od-error">{fieldErrors.payerPhone}</p>
            )}
          </div>

          {customFormFields.length > 0 && (
            <DynamicFormFields
              fields={customFormFields}
              values={formResponses}
              onChange={updateFormResponse}
              errors={fieldErrors}
            />
          )}

          {category.allowCustomAmount && (
            <div className="space-y-2 rounded-lg border border-od-border bg-od-bg/40 p-4">
              {!useCustomPayment ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-od-text-muted">
                    Standard total:{" "}
                    <span className="font-medium text-od-navy">
                      {formatCurrency(standardAmount)}
                    </span>
                  </p>
                  <button
                    type="button"
                    className="text-sm font-medium text-od-orange underline-offset-2 hover:underline"
                    onClick={() => {
                      setUseCustomPayment(true);
                      setError(null);
                    }}
                  >
                    Pay a custom amount
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="customAmount">Custom payment amount (XAF)</Label>
                    <button
                      type="button"
                      className="text-sm text-od-text-muted underline-offset-2 hover:underline"
                      onClick={() => {
                        setUseCustomPayment(false);
                        setCustomAmount("");
                        setError(null);
                      }}
                    >
                      Use standard amount
                    </button>
                  </div>
                  <Input
                    id="customAmount"
                    type="number"
                    min={category.minimumAmount ?? 100}
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder={`Min. ${formatCurrency(category.minimumAmount ?? 100)}`}
                    required
                  />
                  <p className="text-xs text-od-text-muted">
                    Minimum custom amount:{" "}
                    {formatCurrency(category.minimumAmount ?? 100)}
                  </p>
                </div>
              )}
            </div>
          )}

          {quantityField && (
            <DynamicFormFields
              fields={[quantityField]}
              values={formResponses}
              onChange={updateFormResponse}
              errors={fieldErrors}
            />
          )}

          {hasBuiltInQuantity && (
            <div className="space-y-2">
              <Label htmlFor="quantity">Number of t-shirts</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.quantity;
                    return next;
                  });
                }}
              />
              {fieldErrors.quantity && (
                <p className="text-sm text-od-error">{fieldErrors.quantity}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Mobile Money network</Label>
            <Select
              value={network}
              onValueChange={(value: "MTN" | "ORANGE") => setNetwork(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select network" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MTN">MTN Mobile Money</SelectItem>
                <SelectItem value="ORANGE">Orange Money</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-od-error">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? "Redirecting..."
              : `Pay ${computedAmount != null ? formatCurrency(computedAmount) : formatCurrency(standardAmount)}`}
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
