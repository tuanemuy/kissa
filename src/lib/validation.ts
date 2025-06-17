import type { z } from "zod/v4";
import { type Result, ResultAsync, ok, err } from "neverthrow";
import { AnyError } from "./error.ts";

export class ValidationError<T> extends AnyError {
  override readonly name = "ValidationError";

  constructor(
    public readonly error: z.ZodError<T>,
    override readonly message: string,
    cause?: unknown,
  ) {
    super(message, cause);
  }
}

export function validate<T extends z.ZodType>(
  schema: T,
  data: unknown,
): Result<z.infer<T>, ValidationError<z.infer<T>>> {
  const result = schema.safeParse(data);

  if (!result.success) {
    return err(
      new ValidationError(
        result.error,
        "Validation error occurred",
        result.error,
      ),
    );
  }

  return ok(result.data);
}

export function validateAsync<T extends z.ZodType>(
  schema: T,
  data: unknown,
): ResultAsync<z.infer<T>, ValidationError<z.infer<T>>> {
  return ResultAsync.fromPromise(
    schema.parseAsync(data),
    (error) =>
      new ValidationError(
        error as z.ZodError<z.infer<T>>,
        "Validation error occurred",
        error,
      ),
  );
}
