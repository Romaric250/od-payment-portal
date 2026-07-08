import { prisma } from "@/lib/prisma";
import { PublicHeader, PublicFooter } from "@/components/public/site-chrome";
import { CategoryCard } from "@/components/public/category-card";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="min-h-screen bg-od-bg">
      <PublicHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <section className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-od-navy sm:text-4xl">
            Open Dreams Payment Portal
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-od-text-muted">
            Support Open Dreams programs, events, and merchandise securely via MTN
            Mobile Money or Orange Money.
          </p>
        </section>

        {categories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-od-border bg-white p-12 text-center">
            <p className="text-od-text-muted">
              No payment categories are available at the moment. Please check back
              soon.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
