"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CategoryImageUpload } from "@/components/admin/category-image-upload";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  };
}

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

    const payload = {
      name,
      slug,
      description: description || null,
      price: parseInt(price, 10),
      images,
      isActive,
      displayOrder: parseInt(displayOrder, 10) || 0,
      statusPipeline,
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
      if (!res.ok) throw new Error(result.error ?? "Save failed");

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
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!canWrite}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price">Price (XAF)</Label>
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
            <Label>Images</Label>
            <div className="flex flex-wrap gap-3">
              {images.map((url) => (
                <div key={url} className="relative h-20 w-28 overflow-hidden rounded-lg border bg-white">
                  <Image src={url} alt="" fill className="object-contain p-1" />
                  {canWrite && (
                    <button
                      type="button"
                      className="absolute right-1 top-1 rounded bg-white/90 px-1 text-xs"
                      onClick={() => setImages(images.filter((i) => i !== url))}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            {canWrite && (
              <CategoryImageUpload
                onComplete={(urls) => setImages([...images, ...urls])}
                onError={(message) => setError(message)}
              />
            )}
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
