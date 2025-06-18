import type { UserId } from "@/core/domain/user/types";
import { regionIdSchema } from "@/core/domain/region/types";
import { locationIdSchema } from "@/core/domain/location/types";
import { ApplicationError } from "@/lib/error";
import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";
import type { Context } from "../context";

export interface GetUserFavoritesResult {
  regions: Array<{
    id: string;
    name: string;
    description: string | null;
    isPublic: boolean;
    createdAt: Date;
  }>;
  locations: Array<{
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    regionId: string;
    regionName: string;
    isPublic: boolean;
    createdAt: Date;
  }>;
}

export async function getUserFavorites(
  context: Context,
  userId: UserId,
): Promise<Result<GetUserFavoritesResult, ApplicationError>> {
  try {
    // Get all favorites for this user
    const favoritesResult =
      await context.favoriteRepository.findByUserId(userId);
    if (favoritesResult.isErr()) {
      return err(
        new ApplicationError("Failed to get favorites", favoritesResult.error),
      );
    }

    const favorites = favoritesResult.value;
    const regionIds = favorites
      .filter((f) => f.regionId !== null)
      .map((f) => f.regionId as string);
    const locationIds = favorites
      .filter((f) => f.locationId !== null)
      .map((f) => f.locationId as string);

    // Get region details
    const regions = [];
    for (const regionId of regionIds) {
      const validatedRegionId = regionIdSchema.parse(regionId);
      const regionResult =
        await context.regionRepository.findById(validatedRegionId);
      if (regionResult.isOk() && regionResult.value) {
        regions.push({
          id: regionResult.value.id,
          name: regionResult.value.name,
          description: regionResult.value.description,
          isPublic: regionResult.value.isPublic,
          createdAt: regionResult.value.createdAt,
        });
      }
    }

    // Get location details with region names
    const locations = [];
    for (const locationId of locationIds) {
      const validatedLocationId = locationIdSchema.parse(locationId);
      const locationResult =
        await context.locationRepository.findById(validatedLocationId);
      if (locationResult.isOk() && locationResult.value) {
        const location = locationResult.value;

        // Get region name
        const regionResult = await context.regionRepository.findById(
          location.regionId,
        );
        const regionName =
          regionResult.isOk() && regionResult.value
            ? regionResult.value.name
            : "Unknown Region";

        locations.push({
          id: location.id,
          name: location.name,
          description: location.description,
          category: location.category,
          regionId: location.regionId,
          regionName,
          isPublic: location.isPublic,
          createdAt: location.createdAt,
        });
      }
    }

    return ok({
      regions: regions.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      ),
      locations: locations.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      ),
    });
  } catch (error) {
    return err(new ApplicationError("Failed to get user favorites", error));
  }
}
