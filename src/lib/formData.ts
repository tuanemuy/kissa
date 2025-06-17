import type { ValidationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import type { Result } from "neverthrow";
import type { z } from "zod/v4";

/**
 * Safely extracts and validates FormData fields using a Zod schema
 */
export function parseFormData<T extends z.ZodType>(
  formData: FormData,
  schema: T,
): Result<z.infer<T>, ValidationError> {
  const data: Record<string, unknown> = {};

  // Extract all form data entries
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      // Handle empty strings as undefined for optional fields
      data[key] = value === "" ? undefined : value;
    } else {
      // Handle file uploads if needed in the future
      data[key] = value;
    }
  }

  return validate(schema, data);
}
