import type { Location, LocationWithStats } from "@/core/domain/location/types";
import { listLocationsQuerySchema } from "@/core/domain/location/types";
import type { RegionId } from "@/core/domain/region/types";
import type { UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { type Result, err } from "neverthrow";
import { z } from "zod/v4";
import type { Context } from "../context";

export const listLocationsInputSchema = listLocationsQuerySchema.extend({
  includeStats: z.boolean().optional().default(false),
});
export type ListLocationsInput = z.infer<typeof listLocationsInputSchema>;

export async function listLocations(
  context: Context,
  input: ListLocationsInput,
  userId?: UserId,
): Promise<
  Result<
    { items: Location[] | LocationWithStats[]; count: number },
    ApplicationError
  >
> {
  const parseResult = validate(listLocationsInputSchema, input);
  if (parseResult.isErr()) {
    return err(new ApplicationError("Invalid query input", parseResult.error));
  }

  const query = parseResult.value;

  // If filtering by region, check if region exists and is accessible
  if (query.filter?.regionId) {
    const regionResult = await context.regionRepository.findById(
      query.filter.regionId,
    );
    if (regionResult.isErr()) {
      return err(
        new ApplicationError("Failed to find region", regionResult.error),
      );
    }

    const region = regionResult.value;
    if (!region) {
      return err(new ApplicationError("Region not found"));
    }

    // If region is private, only owner can see its locations
    if (!region.isPublic && region.creatorId !== userId) {
      return err(
        new ApplicationError("Not authorized to view locations in this region"),
      );
    }
  }

  // For anonymous users, only show public locations
  const filterQuery = {
    ...query,
    filter: {
      ...query.filter,
      isPublic: userId ? query.filter?.isPublic : true, // Force public for anonymous users
    },
  };

  // Use appropriate repository method based on includeStats
  if (query.includeStats) {
    const listResult =
      await context.locationRepository.listWithStats(filterQuery);
    return listResult.mapErr(
      (error) => new ApplicationError("Failed to list locations", error),
    );
  }
  const listResult = await context.locationRepository.list(filterQuery);
  return listResult.mapErr(
    (error) => new ApplicationError("Failed to list locations", error),
  );
}
