import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import { getDisplayPrice } from "@/components/public/platform-fee-breakdown";
import { CategoryCoverImage } from "@/components/public/category-cover-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CategoryCardProps {
  category: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    price: number;
    images: string[];
    categoryType?: string;
    includePlatformFee?: boolean;
    allowCustomAmount?: boolean;
    minimumAmount?: number | null;
  };
}

export function CategoryCard({ category }: CategoryCardProps) {
  const coverImage = category.images[0];
  const displayPrice = getDisplayPrice(
    category.price,
    category.includePlatformFee ?? false
  );

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      {coverImage ? (
        <CategoryCoverImage src={coverImage} alt={category.name} />
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center bg-od-bg text-od-text-muted">
          No image
        </div>
      )}
      <CardHeader>
        <CardTitle>{category.name}</CardTitle>
        {category.description && (
          <CardDescription className="line-clamp-2">
            {category.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <p className="text-lg font-semibold text-od-navy">
          {formatCurrency(displayPrice)}
          {category.categoryType === "TSHIRT" && (
            <span className="text-sm font-normal text-od-text-muted"> each</span>
          )}
        </p>
        <Button asChild>
          <Link href={`/pay/${category.slug}`}>Pay</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
