"use client";

import { CategoryForm } from "@/components/admin/category-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FormFieldInput } from "@/lib/validators";

export interface CategoryEditData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  images: string[];
  isActive: boolean;
  displayOrder: number;
  statusPipeline: string[];
  allowCustomAmount: boolean;
  minimumAmount: number | null;
  categoryType: string;
  postPaymentTitle: string | null;
  postPaymentDescription: string | null;
  postPaymentLink: string | null;
  postPaymentLinkLabel: string | null;
  notificationEmails: string[];
  includePlatformFee: boolean;
  formFields: FormFieldInput[];
}

interface CategoryEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategoryEditData;
  onUpdated: () => void;
}

export function CategoryEditDialog({
  open,
  onOpenChange,
  category,
  onUpdated,
}: CategoryEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit category</DialogTitle>
          <DialogDescription>
            Update pricing, checkout fields, notifications, and post-payment content.
          </DialogDescription>
        </DialogHeader>
        <CategoryForm
          key={category.id + String(open)}
          layout="plain"
          initialData={category}
          onSaved={() => {
            onUpdated();
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
