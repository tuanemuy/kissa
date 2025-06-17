import type {
  Location,
  LocationId,
  LocationWithEditors,
  LocationWithStats,
} from "@/core/domain/location/types";
import type { UserId } from "@/core/domain/user/types";
import { ApplicationError, AuthorizationError } from "@/lib/error";
import { type Result, err, ok } from "neverthrow";
import type { Context } from "../context";

export type GetLocationOptions = {
  includeStats?: boolean;
  includeEditors?: boolean;
};

export async function getLocation(
  context: Context,
  locationId: LocationId,
  userId?: UserId,
  options: GetLocationOptions = {},
): Promise<
  Result<
    Location | LocationWithStats | LocationWithEditors | null,
    ApplicationError | AuthorizationError
  >
> {
  const { includeStats = false, includeEditors = false } = options;

  // Get location with appropriate relations
  let locationResult: Result<
    Location | LocationWithStats | LocationWithEditors | null,
    ApplicationError
  >;

  if (includeStats && includeEditors) {
    // For simplicity, get location with stats and then add editors separately
    const [statsResult, editorsResult] = await Promise.all([
      context.locationRepository.findByIdWithStats(locationId),
      context.locationRepository.findEditorsByLocation(locationId),
    ]);

    if (statsResult.isErr()) {
      return err(
        new ApplicationError("Failed to find location", statsResult.error),
      );
    }

    if (editorsResult.isErr()) {
      return err(
        new ApplicationError(
          "Failed to find location editors",
          editorsResult.error,
        ),
      );
    }

    const locationWithStats = statsResult.value;
    if (!locationWithStats) {
      return ok(null);
    }

    const editors = editorsResult.value;
    const locationWithStatsAndEditors = { ...locationWithStats, editors };
    locationResult = ok(locationWithStatsAndEditors);
  } else if (includeStats) {
    locationResult = (
      await context.locationRepository.findByIdWithStats(locationId)
    ).mapErr(
      (error) =>
        new ApplicationError("Failed to get location with stats", error),
    );
  } else if (includeEditors) {
    locationResult = (
      await context.locationRepository.findByIdWithEditors(locationId)
    ).mapErr(
      (error) =>
        new ApplicationError("Failed to get location with editors", error),
    );
  } else {
    locationResult = (
      await context.locationRepository.findById(locationId)
    ).mapErr((error) => new ApplicationError("Failed to get location", error));
  }

  if (locationResult.isErr()) {
    return err(
      new ApplicationError("Failed to find location", locationResult.error),
    );
  }

  const location = locationResult.value;
  if (!location) {
    return ok(null);
  }

  // Check access permissions
  if (!location.isPublic) {
    if (!userId) {
      return err(
        new AuthorizationError(
          "Authentication required to view private location",
        ),
      );
    }

    // Get region to check ownership
    const regionResult = await context.regionRepository.findById(
      location.regionId,
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

    // Check if user is region owner or location editor
    const isRegionOwner = region.creatorId === userId;
    let isLocationEditor = false;

    if (!isRegionOwner) {
      const isEditorResult = await context.locationRepository.isUserEditor(
        locationId,
        userId,
      );
      if (isEditorResult.isErr()) {
        return err(
          new ApplicationError(
            "Failed to check editor permissions",
            isEditorResult.error,
          ),
        );
      }
      isLocationEditor = isEditorResult.value;
    }

    if (!isRegionOwner && !isLocationEditor) {
      return err(
        new AuthorizationError("Not authorized to view this private location"),
      );
    }
  }

  return ok(location);
}
