import Link from "next/link";
import { formatCurrency } from "@/lib/format";
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
  };
}

export function CategoryCard({ category }: CategoryCardProps) {
  const coverImage = category.images[0];

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
          {formatCurrency(category.price)}
        </p>
        <Button asChild>
          <Link href={`/pay/${category.slug}`}>Pay</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
