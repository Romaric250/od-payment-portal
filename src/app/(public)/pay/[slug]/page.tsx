import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CategoryCoverImage } from "@/components/public/category-cover-image";
import { formatCurrency } from "@/lib/format";
import { PublicHeader, PublicFooter } from "@/components/public/site-chrome";
import { CheckoutForm } from "@/components/public/checkout-form";
import { buildMetadata, LOGO_CDN_URL, siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const category = await prisma.category.findFirst({
    where: { slug: params.slug, isActive: true },
  });

  if (!category) {
    return { title: "Category Not Found" };
  }

  const description =
    category.description ??
    `Pay ${category.price.toLocaleString()} FCFA for ${category.name} on ${siteConfig.name}.`;

  return buildMetadata({
    title: `${category.name} — ${siteConfig.name}`,
    description,
    path: `/pay/${category.slug}`,
    image:
      category.images[0]?.startsWith("http")
        ? category.images[0]
        : LOGO_CDN_URL,
  });
}

export default async function PayPage({
  params,
}: {
  params: { slug: string };
}) {
  const category = await prisma.category.findFirst({
    where: { slug: params.slug, isActive: true },
  });

  if (!category) notFound();

  const coverImage = category.images[0];

  return (
    <div className="min-h-screen bg-od-bg">
      <PublicHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            {coverImage ? (
              <CategoryCoverImage
                src={coverImage}
                alt={category.name}
                className="mb-6 overflow-hidden rounded-xl"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            ) : (
              <div className="mb-6 flex aspect-[4/3] items-center justify-center rounded-xl bg-white text-od-text-muted">
                No image
              </div>
            )}
            <h1 className="text-3xl font-bold text-od-navy">{category.name}</h1>
            {category.description && (
              <p className="mt-3 text-od-text-muted">{category.description}</p>
            )}
            <p className="mt-4 text-2xl font-semibold text-od-orange">
              {formatCurrency(category.price)}
            </p>
          </div>
          <CheckoutForm
            category={{
              slug: category.slug,
              name: category.name,
              price: category.price,
            }}
          />
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
