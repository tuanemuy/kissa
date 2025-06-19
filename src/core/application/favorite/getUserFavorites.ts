import { locationIdSchema } from "@/core/domain/location/types";
import { regionIdSchema } from "@/core/domain/region/types";
import type { UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";
import type { Context } from "../context";

export interface GetUserFavoritesResult {
  items: Array<{
    id: string;
    name: string;
    description: string | null;
    isPublic: boolean;
    createdAt: Date;
    targetType: "region" | "location";
    category?: string | null;
    regionId?: string;
    regionName?: string;
  }>;
  count: number;
}

export async function getUserFavorites(
  context: Context,
  userId: UserId,
  options?: { targetType?: "region" | "location" | "all" },
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
    const filteredFavorites =
      options?.targetType && options.targetType !== "all"
        ? favorites.filter((f) => f.targetType === options.targetType)
        : favorites;

    const items = [];

    for (const favorite of filteredFavorites) {
      if (favorite.regionId) {
        const validatedRegionId = regionIdSchema.parse(favorite.regionId);
        const regionResult =
          await context.regionRepository.findById(validatedRegionId);
        if (regionResult.isOk() && regionResult.value) {
          items.push({
            id: regionResult.value.id,
            name: regionResult.value.name,
            description: regionResult.value.description,
            isPublic: regionResult.value.isPublic,
            createdAt: regionResult.value.createdAt,
            targetType: "region" as const,
          });
        }
      } else if (favorite.locationId) {
        const validatedLocationId = locationIdSchema.parse(favorite.locationId);
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

          items.push({
            id: location.id,
            name: location.name,
            description: location.description,
            isPublic: location.isPublic,
            createdAt: location.createdAt,
            targetType: "location" as const,
            category: location.category,
            regionId: location.regionId,
            regionName,
          });
        }
      }
    }

    return ok({
      items: items.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      ),
      count: items.length,
    });
  } catch (error) {
    return err(new ApplicationError("Failed to get user favorites", error));
  }
}
