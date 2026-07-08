import Image from "next/image";
import { cn } from "@/lib/utils";

interface CategoryCoverImageProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}

export function CategoryCoverImage({
  src,
  alt,
  className,
  priority,
  sizes = "(max-width: 768px) 100vw, 33vw",
}: CategoryCoverImageProps) {
  return (
    <div className={cn("relative aspect-[4/3] bg-white", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        className="object-contain p-3"
        sizes={sizes}
        priority={priority}
      />
    </div>
  );
}
