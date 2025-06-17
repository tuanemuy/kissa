import { type Result, err, ok } from "neverthrow";
import { z } from "zod/v4";

import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
const simplePaginationSchema = z.object({
  page: z.number().positive(),
  limit: z.number().positive().max(100),
});
import type {
  ListRegionsQuery,
  Region,
  RegionWithStats,
} from "@/core/domain/region/types";
import type { UserId } from "@/core/domain/user/types";

import type { Context } from "../context";

export const listRegionsInputSchema = z.object({
  pagination: simplePaginationSchema,
  filter: z
    .object({
      creatorId: z.string().uuid().optional(),
      isPublic: z.boolean().optional(),
      search: z.string().optional(),
    })
    .optional(),
  sort: z
    .object({
      field: z.enum(["createdAt", "updatedAt", "name"]),
      order: z.enum(["asc", "desc"]),
    })
    .optional(),
});
export type ListRegionsInput = z.infer<typeof listRegionsInputSchema>;

export async function listRegions(
  context: Context,
  input: ListRegionsInput,
): Promise<Result<{ items: Region[]; count: number }, ApplicationError>> {
  const parseResult = validate(listRegionsInputSchema, input);
  if (parseResult.isErr()) {
    return err(new ApplicationError("Invalid input", parseResult.error));
  }

  const query: ListRegionsQuery = {
    ...parseResult.value,
    filter: parseResult.value.filter
      ? {
          ...parseResult.value.filter,
          creatorId: parseResult.value.filter.creatorId as UserId | undefined,
        }
      : undefined,
  };

  const result = await context.regionRepository.list(query);
  if (result.isErr()) {
    return err(new ApplicationError("Failed to list regions", result.error));
  }

  return ok(result.value);
}

export async function listRegionsWithStats(
  context: Context,
  input: ListRegionsInput,
): Promise<
  Result<{ items: RegionWithStats[]; count: number }, ApplicationError>
> {
  const parseResult = validate(listRegionsInputSchema, input);
  if (parseResult.isErr()) {
    return err(new ApplicationError("Invalid input", parseResult.error));
  }

  const query: ListRegionsQuery = {
    ...parseResult.value,
    filter: parseResult.value.filter
      ? {
          ...parseResult.value.filter,
          creatorId: parseResult.value.filter.creatorId as UserId | undefined,
        }
      : undefined,
  };

  const result = await context.regionRepository.listWithStats(query);
  if (result.isErr()) {
    return err(
      new ApplicationError("Failed to list regions with stats", result.error),
    );
  }

  return ok(result.value);
}
