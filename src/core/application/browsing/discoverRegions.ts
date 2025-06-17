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
  RegionWithStats,
} from "@/core/domain/region/types";

import type { Context } from "../context";

export const discoverRegionsInputSchema = z.object({
  pagination: simplePaginationSchema,
  filter: z
    .object({
      search: z.string().optional(),
      // Only show public regions for public discovery
    })
    .optional(),
  sort: z
    .object({
      field: z.enum(["createdAt", "updatedAt", "name"]),
      order: z.enum(["asc", "desc"]),
    })
    .optional()
    .default({ field: "createdAt", order: "desc" }),
});
export type DiscoverRegionsInput = z.infer<typeof discoverRegionsInputSchema>;

/**
 * Public discovery service for visitors to browse regions without authentication
 */
export async function discoverRegions(
  context: Context,
  input: DiscoverRegionsInput,
): Promise<
  Result<{ items: RegionWithStats[]; count: number }, ApplicationError>
> {
  const parseResult = validate(discoverRegionsInputSchema, input);
  if (parseResult.isErr()) {
    return err(new ApplicationError("Invalid input", parseResult.error));
  }

  // Build query with public-only filter
  const query: ListRegionsQuery = {
    ...parseResult.value,
    filter: {
      ...parseResult.value.filter,
      isPublic: true, // Force public visibility for discovery
    },
  };

  const result = await context.regionRepository.listWithStats(query);
  if (result.isErr()) {
    return err(
      new ApplicationError("Failed to discover regions", result.error),
    );
  }

  return ok(result.value);
}

/**
 * Search regions by keyword for public discovery
 */
export async function searchRegions(
  context: Context,
  searchTerm: string,
  pagination: { page: number; limit: number },
): Promise<
  Result<{ items: RegionWithStats[]; count: number }, ApplicationError>
> {
  if (!searchTerm.trim()) {
    return err(new ApplicationError("Search term cannot be empty"));
  }

  return discoverRegions(context, {
    pagination,
    filter: { search: searchTerm },
    sort: { field: "name", order: "asc" },
  });
}
