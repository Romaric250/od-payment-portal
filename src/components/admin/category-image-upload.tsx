"use client";

import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CategoryImageUploadProps {
  onComplete: (urls: string[]) => void;
  onError: (message: string) => void;
}

export function CategoryImageUpload({
  onComplete,
  onError,
}: CategoryImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function resetSelection() {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function selectFile(file: File | undefined) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      onError("Please select a PNG, JPG, or WEBP image");
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      onError("Image must be 4MB or smaller");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0]);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    selectFile(event.dataTransfer.files?.[0]);
  }

  async function handleUpload() {
    if (!selectedFile || uploading) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/admin/upload/category-image", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const result = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !result.url) {
        throw new Error(result.error ?? "Upload failed");
      }

      onComplete([result.url]);
      resetSelection();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className="rounded-xl border-2 border-dashed border-od-border bg-od-bg px-6 py-8"
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleInputChange}
      />

      {!selectedFile ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <UploadCloud className="h-10 w-10 text-od-orange" />
          <p className="text-sm font-medium text-od-navy">
            Drag & drop an image, or choose a file
          </p>
          <p className="text-xs text-od-text-muted">PNG, JPG or WEBP up to 4MB</p>
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
            Choose file
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="relative h-28 w-28 overflow-hidden rounded-lg border bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl!}
              alt="Selected preview"
              className="h-full w-full object-contain p-1"
            />
          </div>
          <div className="flex flex-1 flex-col gap-3">
            <div>
              <p className="text-sm font-medium text-od-navy">{selectedFile.name}</p>
              <p className="text-xs text-od-text-muted">
                {(selectedFile.size / 1024).toFixed(0)} KB
                {uploading ? " · Uploading..." : " · Ready to upload"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={handleUpload} disabled={uploading}>
                {uploading ? "Uploading..." : "Upload image"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetSelection}
                disabled={uploading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
