import { type Result, err, ok } from "neverthrow";
import { z } from "zod/v4";

import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
const simplePaginationSchema = z.object({
  page: z.number().positive(),
  limit: z.number().positive().max(100),
});
import type {
  ListLocationsQuery,
  LocationWithStats,
} from "@/core/domain/location/types";
import type { RegionId } from "@/core/domain/region/types";

import type { Context } from "../context";

export const discoverLocationsInputSchema = z.object({
  pagination: simplePaginationSchema,
  filter: z
    .object({
      regionId: z.string().uuid().optional(),
      category: z.string().optional(),
      search: z.string().optional(),
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
export type DiscoverLocationsInput = z.infer<
  typeof discoverLocationsInputSchema
>;

/**
 * Public discovery service for visitors to browse locations without authentication
 */
export async function discoverLocations(
  context: Context,
  input: DiscoverLocationsInput,
): Promise<
  Result<{ items: LocationWithStats[]; count: number }, ApplicationError>
> {
  const parseResult = validate(discoverLocationsInputSchema, input);
  if (parseResult.isErr()) {
    return err(new ApplicationError("Invalid input", parseResult.error));
  }

  // If regionId is provided, verify the region exists and is public
  if (parseResult.value.filter?.regionId) {
    const regionResult = await context.regionRepository.findById(
      parseResult.value.filter.regionId as RegionId,
    );
    if (regionResult.isErr()) {
      return err(
        new ApplicationError("Failed to verify region", regionResult.error),
      );
    }

    if (!regionResult.value) {
      return err(new ApplicationError("Region not found"));
    }

    if (!regionResult.value.isPublic) {
      return err(new ApplicationError("Region is not public"));
    }
  }

  // Build query with public-only filter
  const query: ListLocationsQuery = {
    ...parseResult.value,
    filter: {
      ...parseResult.value.filter,
      regionId: parseResult.value.filter?.regionId as RegionId | undefined,
      isPublic: true, // Force public visibility for discovery
    },
  };

  const result = await context.locationRepository.listWithStats(query);
  if (result.isErr()) {
    return err(
      new ApplicationError("Failed to discover locations", result.error),
    );
  }

  return ok(result.value);
}

/**
 * Discover locations within a specific region
 */
export async function discoverLocationsByRegion(
  context: Context,
  regionId: string,
  pagination: { page: number; limit: number },
): Promise<
  Result<{ items: LocationWithStats[]; count: number }, ApplicationError>
> {
  return discoverLocations(context, {
    pagination,
    filter: { regionId },
    sort: { field: "name", order: "asc" },
  });
}

/**
 * Search locations by keyword
 */
export async function searchLocations(
  context: Context,
  searchTerm: string,
  regionId: string | undefined,
  pagination: { page: number; limit: number },
): Promise<
  Result<{ items: LocationWithStats[]; count: number }, ApplicationError>
> {
  if (!searchTerm.trim()) {
    return err(new ApplicationError("Search term cannot be empty"));
  }

  return discoverLocations(context, {
    pagination,
    filter: {
      search: searchTerm,
      regionId,
    },
    sort: { field: "name", order: "asc" },
  });
}

/**
 * Discover locations by category
 */
export async function discoverLocationsByCategory(
  context: Context,
  category: string,
  regionId: string | undefined,
  pagination: { page: number; limit: number },
): Promise<
  Result<{ items: LocationWithStats[]; count: number }, ApplicationError>
> {
  return discoverLocations(context, {
    pagination,
    filter: {
      category,
      regionId,
    },
    sort: { field: "name", order: "asc" },
  });
}
