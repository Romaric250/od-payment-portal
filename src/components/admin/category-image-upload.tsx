"use client";

import { UploadDropzone } from "@/lib/uploadthing";

interface CategoryImageUploadProps {
  onComplete: (urls: string[]) => void;
  onError: (message: string) => void;
}

export function CategoryImageUpload({
  onComplete,
  onError,
}: CategoryImageUploadProps) {
  return (
    <UploadDropzone
      endpoint="categoryImage"
      appearance={{
        container:
          "border-2 border-dashed border-od-border bg-od-bg rounded-xl px-6 py-10 ut-ready:bg-od-bg hover:border-od-orange hover:bg-orange-50/40 transition-colors",
        uploadIcon: "text-od-orange size-10",
        label: "text-sm font-medium text-od-navy",
        allowedContent: "text-xs text-od-text-muted",
        button:
          "bg-od-orange text-white ut-ready:bg-od-orange ut-uploading:bg-od-orange/70 ut-readying:bg-od-orange/50 rounded-lg text-sm font-medium",
      }}
      content={{
        label: "Drag & drop an image, or click to browse",
        allowedContent: "PNG, JPG or WEBP up to 4MB",
        button: "Choose file",
      }}
      onClientUploadComplete={(res) => {
        onComplete(res.map((f) => f.ufsUrl));
      }}
      onUploadError={(err) => onError(err.message)}
    />
  );
}
