import type { ValidationError } from "@/lib/validation";
import { validate } from "@/lib/validation";
import type { Result } from "neverthrow";
import { z } from "zod/v4";

/**
 * Safely extracts a string field from FormData
 */
export function getFormDataString(
  formData: FormData,
  key: string,
): string | undefined {
  const value = formData.get(key);
  if (typeof value === "string") {
    return value === "" ? undefined : value;
  }
  return undefined;
}

/**
 * Safely extracts a file field from FormData
 */
export function getFormDataFile(
  formData: FormData,
  key: string,
): File | undefined {
  const value = formData.get(key);
  if (value instanceof File && value.size > 0) {
    return value;
  }
  return undefined;
}

/**
 * Safely extracts and validates FormData fields using a Zod schema
 */
export function parseFormData<T extends z.ZodType>(
  formData: FormData,
  schema: T,
): Result<z.infer<T>, ValidationError<z.infer<T>>> {
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

/**
 * Safely extracts and validates FormData fields using a Zod object schema
 */
export function parseFormDataObject<T extends Record<string, z.ZodType>>(
  formData: FormData,
  fields: T,
): Result<Record<string, unknown>, ValidationError<Record<string, unknown>>> {
  const schema = z.object(fields);
  return parseFormData(formData, schema) as Result<
    Record<string, unknown>,
    ValidationError<Record<string, unknown>>
  >;
}
