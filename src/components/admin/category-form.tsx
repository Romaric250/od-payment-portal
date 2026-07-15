"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CategoryImageUpload } from "@/components/admin/category-image-upload";
import { FormFieldEditor } from "@/components/admin/form-field-editor";
import { slugify } from "@/lib/utils";
import type { FormFieldInput } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CategoryFormProps {
  initialData?: {
    id?: string;
    name: string;
    slug: string;
    description?: string | null;
    price: number;
    images: string[];
    isActive: boolean;
    displayOrder: number;
    statusPipeline: string[];
    allowCustomAmount?: boolean;
    minimumAmount?: number | null;
    categoryType?: string;
    formFields?: FormFieldInput[];
  };
}

const CATEGORY_TYPES = [
  { value: "STANDARD", label: "Standard" },
  { value: "TSHIRT", label: "T-Shirt" },
  { value: "DONATION", label: "Donation" },
  { value: "EVENT", label: "Event" },
  { value: "SCHOLARSHIP", label: "Scholarship" },
];

export function CategoryForm({ initialData }: CategoryFormProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const canWrite = session?.user?.accessLevel === "READ_WRITE";
  const isEdit = Boolean(initialData?.id);

  const [name, setName] = useState(initialData?.name ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [price, setPrice] = useState(String(initialData?.price ?? ""));
  const [images, setImages] = useState<string[]>(initialData?.images ?? []);
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [displayOrder, setDisplayOrder] = useState(
    String(initialData?.displayOrder ?? 0)
  );
  const [statusPipeline, setStatusPipeline] = useState<string[]>(
    initialData?.statusPipeline ?? ["Received"]
  );
  const [allowCustomAmount, setAllowCustomAmount] = useState(
    initialData?.allowCustomAmount ?? false
  );
  const [minimumAmount, setMinimumAmount] = useState(
    String(initialData?.minimumAmount ?? "")
  );
  const [categoryType, setCategoryType] = useState(
    initialData?.categoryType ?? "STANDARD"
  );
  const [formFields, setFormFields] = useState<FormFieldInput[]>(
    initialData?.formFields ?? []
  );
  const [newStatus, setNewStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isEdit && name && !initialData?.slug) {
      setSlug(slugify(name));
    }
  }, [name, isEdit, initialData?.slug]);

  function addStatus() {
    const trimmed = newStatus.trim();
    if (!trimmed || statusPipeline.includes(trimmed)) return;
    setStatusPipeline([...statusPipeline, trimmed]);
    setNewStatus("");
  }

  function removeStatus(index: number) {
    if (statusPipeline.length <= 1) return;
    setStatusPipeline(statusPipeline.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite) return;

    setLoading(true);
    setError(null);

    const trimmedDescription = description.trim();
    if (trimmedDescription.length > 2000) {
      setError("Description must be 2000 characters or less");
      setLoading(false);
      return;
    }

    const parsedPrice = parseInt(price, 10);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 100) {
      setError("Price must be at least 100 XAF");
      setLoading(false);
      return;
    }

    const parsedDisplayOrder = parseInt(displayOrder, 10);
    if (!Number.isFinite(parsedDisplayOrder) || parsedDisplayOrder < 0) {
      setError("Display order must be zero or greater");
      setLoading(false);
      return;
    }

    for (const field of formFields) {
      if (field.key.length < 2) {
        setError(`Field "${field.label}" needs a key with at least 2 characters (e.g. size, colour)`);
        setLoading(false);
        return;
      }
      if (
        (field.type === "SELECT" || field.type === "MULTI_SELECT") &&
        field.options.filter((option) => option.trim()).length === 0
      ) {
        setError(`${field.label} needs at least one option`);
        setLoading(false);
        return;
      }
    }

    const payload = {
      name: name.trim(),
      slug: slug.trim(),
      description: trimmedDescription || null,
      price: parsedPrice,
      images,
      isActive,
      displayOrder: parsedDisplayOrder,
      statusPipeline: statusPipeline.map((status) => status.trim()).filter(Boolean),
      allowCustomAmount,
      minimumAmount: allowCustomAmount
        ? parseInt(minimumAmount, 10) || null
        : null,
      categoryType,
      formFields: formFields.map((field, index) => ({
        ...(field.id ? { id: field.id } : {}),
        label: field.label.trim(),
        key: field.key.trim(),
        type: field.type,
        required: field.required,
        order: index,
        options: field.options.map((option) => option.trim()).filter(Boolean),
        affectsPrice: field.affectsPrice,
      })),
    };

    try {
      const res = await fetch(
        isEdit
          ? `/api/admin/categories/${initialData!.id}`
          : "/api/admin/categories",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const result = await res.json();
      if (!res.ok) {
        const detail =
          result.fields && typeof result.fields === "object"
            ? Object.entries(result.fields as Record<string, string>)
                .map(([field, message]) => `${field}: ${message}`)
                .join(" · ")
            : null;
        throw new Error(detail || result.error || "Save failed");
      }

      router.push(`/admin/categories/${result.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit Category" : "New Category"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Images</Label>
          {images.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {images.map((url) => (
                <div key={url} className="relative h-20 w-28 overflow-hidden rounded-lg border bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-contain p-1" />
                  {canWrite && (
                    <button
                      type="button"
                      className="absolute right-1 top-1 rounded bg-white/90 px-1 text-xs shadow"
                      onClick={() => setImages((current) => current.filter((i) => i !== url))}
                      aria-label="Remove image"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-od-text-muted">No images uploaded yet.</p>
          )}
          {canWrite && (
            <CategoryImageUpload
              onComplete={(urls) => setImages((current) => [...current, ...urls])}
              onError={(message) => setError(message)}
            />
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!canWrite}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                disabled={!canWrite}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">Description</Label>
              <span
                className={`text-xs ${
                  description.length > 2000 ? "text-od-error" : "text-od-text-muted"
                }`}
              >
                {description.length}/2000
              </span>
            </div>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!canWrite}
              maxLength={2000}
              rows={4}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="price">Base price (XAF)</Label>
              <Input
                id="price"
                type="number"
                min={100}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={!canWrite}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayOrder">Display order</Label>
              <Input
                id="displayOrder"
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                disabled={!canWrite}
              />
            </div>
            <div className="space-y-2">
              <Label>Category type</Label>
              <Select
                value={categoryType}
                disabled={!canWrite}
                onValueChange={setCategoryType}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-od-border p-4">
            <div className="flex items-center gap-3">
              <Switch
                checked={allowCustomAmount}
                onCheckedChange={setAllowCustomAmount}
                disabled={!canWrite}
              />
              <Label>Allow custom payment amount</Label>
            </div>
            {allowCustomAmount && (
              <div className="space-y-2">
                <Label htmlFor="minimumAmount">Minimum amount (XAF)</Label>
                <Input
                  id="minimumAmount"
                  type="number"
                  min={100}
                  value={minimumAmount}
                  onChange={(e) => setMinimumAmount(e.target.value)}
                  disabled={!canWrite}
                  required
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={!canWrite}
            />
            <Label>Active on public site</Label>
          </div>

          <div className="space-y-3">
            <Label>Custom form fields</Label>
            {categoryType === "TSHIRT" && (
              <p className="text-sm text-od-text-muted">
                T-shirt categories include a quantity selector at checkout. Price is
                calculated as unit price × quantity.
              </p>
            )}
            <p className="text-sm text-od-text-muted">
              Add extra questions for checkout (e.g. size). Name, email, and phone
              are always collected automatically.
            </p>
            <FormFieldEditor
              fields={formFields}
              onChange={setFormFields}
              disabled={!canWrite}
            />
          </div>

          <div className="space-y-3">
            <Label>Fulfillment status pipeline</Label>
            <div className="space-y-2">
              {statusPipeline.map((status, index) => (
                <div key={`${status}-${index}`} className="flex items-center gap-2">
                  <Input value={status} disabled className="flex-1" />
                  {canWrite && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeStatus(index)}
                      disabled={statusPipeline.length <= 1}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {canWrite && (
              <div className="flex gap-2">
                <Input
                  placeholder="Add status e.g. Delivered"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                />
                <Button type="button" variant="outline" onClick={addStatus}>
                  Add
                </Button>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-od-error">{error}</p>}

          {canWrite && (
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Category"}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
