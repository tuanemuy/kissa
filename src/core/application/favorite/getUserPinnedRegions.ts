import type { UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";
import type { Context } from "../context";

export interface PinnedRegion {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  createdAt: Date;
  pinnedAt: Date;
  order: number;
}

export async function getUserPinnedRegions(
  context: Context,
  userId: UserId,
): Promise<Result<PinnedRegion[], ApplicationError>> {
  try {
    // Get pinned regions for this user
    const pinnedResult =
      await context.favoriteRepository.findPinnedRegionsByUserId(userId);
    if (pinnedResult.isErr()) {
      return err(
        new ApplicationError(
          "Failed to get pinned regions",
          pinnedResult.error,
        ),
      );
    }

    const pinnedRegions = pinnedResult.value;
    const regions: PinnedRegion[] = [];

    // Get region details for each pinned region
    for (const pinned of pinnedRegions) {
      const regionResult = await context.regionRepository.findById(
        pinned.regionId,
      );
      if (regionResult.isOk() && regionResult.value) {
        const region = regionResult.value;
        regions.push({
          id: region.id,
          name: region.name,
          description: region.description,
          isPublic: region.isPublic,
          createdAt: region.createdAt,
          pinnedAt: pinned.createdAt,
          order: pinned.order,
        });
      }
    }

    // Sort by order
    return ok(regions.sort((a, b) => a.order - b.order));
  } catch (error) {
    return err(
      new ApplicationError("Failed to get user pinned regions", error),
    );
  }
}
