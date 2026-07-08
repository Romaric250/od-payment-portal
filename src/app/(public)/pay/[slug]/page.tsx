import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";
import { PublicHeader, PublicFooter } from "@/components/public/site-chrome";
import { CheckoutForm } from "@/components/public/checkout-form";

export const dynamic = "force-dynamic";

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
            <div className="relative mb-6 aspect-[16/10] overflow-hidden rounded-xl bg-white">
              {coverImage ? (
                <Image
                  src={coverImage}
                  alt={category.name}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center text-od-text-muted">
                  No image
                </div>
              )}
            </div>
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
