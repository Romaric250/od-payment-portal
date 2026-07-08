import { CategoryForm } from "@/components/admin/category-form";

export default function NewCategoryPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-od-navy">New Category</h1>
        <p className="text-sm text-od-text-muted">
          Create a new payment category for the public portal
        </p>
      </div>
      <CategoryForm />
    </div>
  );
}
