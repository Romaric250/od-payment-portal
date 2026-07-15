import type { ZodError } from "zod";

export function formatZodError(error: ZodError): string {
  const messages = error.issues.map((issue) => {
    const field = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
    return `${field}${issue.message || "Invalid value"}`;
  });

  return messages.join(" · ") || "Invalid input";
}

export function formatZodFieldErrors(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_form";
    if (!fields[key]) {
      fields[key] = issue.message || "Invalid value";
    }
  }

  return fields;
}
