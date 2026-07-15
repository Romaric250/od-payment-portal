"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface PublicFormField {
  id: string;
  label: string;
  key: string;
  type: string;
  required: boolean;
  options: string[];
  order: number;
  affectsPrice: boolean;
}

interface DynamicFormFieldsProps {
  fields: PublicFormField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  errors: Record<string, string>;
}

export function DynamicFormFields({
  fields,
  values,
  onChange,
  errors,
}: DynamicFormFieldsProps) {
  const sorted = [...fields].sort((a, b) => a.order - b.order);

  return (
    <>
      {sorted.map((field) => (
        <div key={field.id} className="space-y-2">
          <Label htmlFor={field.key}>
            {field.label}
            {field.required && <span className="text-od-error"> *</span>}
            {field.affectsPrice && (
              <span className="ml-2 text-xs text-od-text-muted">(affects total)</span>
            )}
          </Label>

          {field.type === "TEXTAREA" ? (
            <Textarea
              id={field.key}
              value={values[field.key] ?? ""}
              onChange={(e) => onChange(field.key, e.target.value)}
            />
          ) : field.type === "SELECT" ? (
            <Select
              value={values[field.key] ?? ""}
              onValueChange={(value) => onChange(field.key, value)}
            >
              <SelectTrigger id={field.key}>
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : field.type === "MULTI_SELECT" ? (
            <div className="space-y-2 rounded-lg border border-od-border p-3">
              {field.options.map((option) => {
                const selected = (values[field.key] ?? "")
                  .split(",")
                  .map((v) => v.trim())
                  .filter(Boolean);
                const checked = selected.includes(option);
                return (
                  <label key={option} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...selected, option]
                          : selected.filter((v) => v !== option);
                        onChange(field.key, next.join(", "));
                      }}
                    />
                    {option}
                  </label>
                );
              })}
            </div>
          ) : (
            <Input
              id={field.key}
              type={
                field.type === "EMAIL"
                  ? "email"
                  : field.type === "NUMBER"
                    ? "number"
                    : field.type === "DATE"
                      ? "date"
                      : field.type === "PHONE"
                        ? "tel"
                        : "text"
              }
              min={field.type === "NUMBER" ? 1 : undefined}
              placeholder={
                field.type === "PHONE" ? "670000000" : undefined
              }
              value={values[field.key] ?? ""}
              onChange={(e) => onChange(field.key, e.target.value)}
            />
          )}

          {errors[field.key] && (
            <p className="text-sm text-od-error">{errors[field.key]}</p>
          )}
        </div>
      ))}
    </>
  );
}
