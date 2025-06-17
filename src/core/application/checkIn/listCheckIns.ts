import { type Result, err, ok } from "neverthrow";
import { z } from "zod/v4";

import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
const simplePaginationSchema = z.object({
  page: z.number().positive(),
  limit: z.number().positive().max(100),
});
import type {
  CheckIn,
  CheckInWithLocation,
  CheckInWithUser,
  ListCheckInsQuery,
} from "@/core/domain/checkIn/types";

import type { Context } from "../context";

export const listCheckInsInputSchema = z.object({
  pagination: simplePaginationSchema,
  filter: z
    .object({
      userId: z.string().uuid().optional(),
      locationId: z.string().uuid().optional(),
      isPublic: z.boolean().optional(),
      hasPhoto: z.boolean().optional(),
      minRating: z.number().int().min(1).max(5).optional(),
    })
    .optional(),
  sort: z
    .object({
      field: z.enum(["createdAt", "updatedAt", "rating"]),
      order: z.enum(["asc", "desc"]),
    })
    .optional(),
});
export type ListCheckInsInput = z.infer<typeof listCheckInsInputSchema>;

export async function listCheckIns(
  context: Context,
  input: ListCheckInsInput,
): Promise<Result<{ items: CheckIn[]; count: number }, ApplicationError>> {
  const parseResult = validate(listCheckInsInputSchema, input);
  if (parseResult.isErr()) {
    return err(new ApplicationError("Invalid input", parseResult.error));
  }

  const query: ListCheckInsQuery = {
    ...parseResult.value,
    filter: parseResult.value.filter
      ? {
          ...parseResult.value.filter,
          userId: parseResult.value.filter.userId as any,
          locationId: parseResult.value.filter.locationId as any,
        }
      : undefined,
  };

  const result = await context.checkInRepository.list(query);
  if (result.isErr()) {
    return err(new ApplicationError("Failed to list check-ins", result.error));
  }

  return ok(result.value);
}

export async function listCheckInsWithUser(
  context: Context,
  input: ListCheckInsInput,
): Promise<
  Result<{ items: CheckInWithUser[]; count: number }, ApplicationError>
> {
  const parseResult = validate(listCheckInsInputSchema, input);
  if (parseResult.isErr()) {
    return err(new ApplicationError("Invalid input", parseResult.error));
  }

  const query: ListCheckInsQuery = {
    ...parseResult.value,
    filter: parseResult.value.filter
      ? {
          ...parseResult.value.filter,
          userId: parseResult.value.filter.userId as any,
          locationId: parseResult.value.filter.locationId as any,
        }
      : undefined,
  };

  const result = await context.checkInRepository.listWithUser(query);
  if (result.isErr()) {
    return err(
      new ApplicationError("Failed to list check-ins with user", result.error),
    );
  }

  return ok(result.value);
}

export async function listCheckInsWithLocation(
  context: Context,
  input: ListCheckInsInput,
): Promise<
  Result<{ items: CheckInWithLocation[]; count: number }, ApplicationError>
> {
  const parseResult = validate(listCheckInsInputSchema, input);
  if (parseResult.isErr()) {
    return err(new ApplicationError("Invalid input", parseResult.error));
  }

  const query: ListCheckInsQuery = {
    ...parseResult.value,
    filter: parseResult.value.filter
      ? {
          ...parseResult.value.filter,
          userId: parseResult.value.filter.userId as any,
          locationId: parseResult.value.filter.locationId as any,
        }
      : undefined,
  };

  const result = await context.checkInRepository.listWithLocation(query);
  if (result.isErr()) {
    return err(
      new ApplicationError(
        "Failed to list check-ins with location",
        result.error,
      ),
    );
  }

  return ok(result.value);
}
