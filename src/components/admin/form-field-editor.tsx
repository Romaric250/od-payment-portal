"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { slugify } from "@/lib/utils";
import type { FormFieldInput } from "@/lib/validators";

const FIELD_TYPES = [
  { value: "TEXT", label: "Text" },
  { value: "EMAIL", label: "Email" },
  { value: "PHONE", label: "Phone" },
  { value: "NUMBER", label: "Number" },
  { value: "DATE", label: "Date" },
  { value: "SELECT", label: "Select" },
  { value: "MULTI_SELECT", label: "Multi-select" },
  { value: "TEXTAREA", label: "Textarea" },
] as const;

interface FormFieldEditorProps {
  fields: FormFieldInput[];
  onChange: (fields: FormFieldInput[]) => void;
  disabled?: boolean;
}

export function FormFieldEditor({ fields, onChange, disabled }: FormFieldEditorProps) {
  function updateField(index: number, patch: Partial<FormFieldInput>) {
    const next = fields.map((field, i) =>
      i === index ? { ...field, ...patch } : field
    );
    onChange(next);
  }

  function addField() {
    onChange([
      ...fields,
      {
        label: "New Field",
        key: `field_${fields.length + 1}`,
        type: "TEXT",
        required: false,
        options: [],
        order: fields.length,
        affectsPrice: false,
      },
    ]);
  }

  function removeField(index: number) {
    onChange(
      fields
        .filter((_, i) => i !== index)
        .map((field, i) => ({ ...field, order: i }))
    );
  }

  function moveField(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((field, i) => ({ ...field, order: i })));
  }

  return (
    <div className="space-y-4">
      {fields.length === 0 && (
        <p className="text-sm text-od-text-muted">
          No custom fields. Checkout will only collect name, email, and phone.
        </p>
      )}

      {fields.map((field, index) => (
        <div
          key={field.id ?? `field-${index}`}
          className="space-y-3 rounded-xl border border-od-border bg-od-bg/50 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-od-navy">Field {index + 1}</p>
            {!disabled && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => moveField(index, -1)}
                  disabled={index === 0}
                >
                  Up
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => moveField(index, 1)}
                  disabled={index === fields.length - 1}
                >
                  Down
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeField(index)}
                >
                  Remove
                </Button>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={field.label}
                disabled={disabled}
                onChange={(e) => {
                  const label = e.target.value;
                  const generatedKey = slugify(label).replace(/-/g, "_");
                  updateField(index, {
                    label,
                    key: field.key.startsWith("field_")
                      ? generatedKey || field.key
                      : field.key,
                  });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Key (min. 2 characters)</Label>
              <Input
                value={field.key}
                disabled={disabled}
                aria-invalid={field.key.length > 0 && field.key.length < 2}
                onChange={(e) =>
                  updateField(index, {
                    key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
                  })
                }
              />
              {field.key.length > 0 && field.key.length < 2 && (
                <p className="text-xs text-od-error">Use at least 2 characters (e.g. size)</p>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={field.type}
                disabled={disabled}
                onValueChange={(value: FormFieldInput["type"]) =>
                  updateField(index, {
                    type: value,
                    affectsPrice: value === "NUMBER" ? field.affectsPrice : false,
                    options:
                      value === "SELECT" || value === "MULTI_SELECT"
                        ? field.options
                        : [],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 pt-7">
              <Switch
                checked={field.required}
                disabled={disabled}
                onCheckedChange={(checked) => updateField(index, { required: checked })}
              />
              <Label>Required</Label>
            </div>
          </div>

          {field.type === "NUMBER" && (
            <div className="flex items-center gap-3">
              <Switch
                checked={field.affectsPrice}
                disabled={disabled}
                onCheckedChange={(checked) =>
                  updateField(index, { affectsPrice: checked })
                }
              />
              <Label>Multiply category price by this value (quantity)</Label>
            </div>
          )}

          {(field.type === "SELECT" || field.type === "MULTI_SELECT") && (
            <div className="space-y-2">
              <Label>Options (one per line)</Label>
              <Textarea
                className="min-h-[120px] font-mono text-sm"
                disabled={disabled}
                placeholder={"Small\nMedium\nLarge"}
                value={field.options.join("\n")}
                onChange={(e) =>
                  updateField(index, {
                    options: e.target.value.split("\n"),
                  })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.stopPropagation();
                  }
                }}
              />
              <p className="text-xs text-od-text-muted">
                Press Enter to add each option on a new line.
              </p>
            </div>
          )}
        </div>
      ))}

      {!disabled && (
        <Button type="button" variant="outline" onClick={addField}>
          Add field
        </Button>
      )}
    </div>
  );
}
