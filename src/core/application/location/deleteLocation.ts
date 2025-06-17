import type { LocationId } from "@/core/domain/location/types";
import type { UserId } from "@/core/domain/user/types";
import { ApplicationError, AuthorizationError } from "@/lib/error";
import { type Result, err, ok } from "neverthrow";
import type { Context } from "../context";

export async function deleteLocation(
  context: Context,
  userId: UserId,
  locationId: LocationId,
): Promise<Result<void, ApplicationError | AuthorizationError>> {
  // Get user to check role
  const userResult = await context.userRepository.findById(userId);
  if (userResult.isErr()) {
    return err(new ApplicationError("Failed to find user", userResult.error));
  }

  const user = userResult.value;
  if (!user) {
    return err(new ApplicationError("User not found"));
  }

  if (user.role !== "editor") {
    return err(new AuthorizationError("Only editors can delete locations"));
  }

  // Get location to check ownership
  const locationResult = await context.locationRepository.findById(locationId);
  if (locationResult.isErr()) {
    return err(
      new ApplicationError("Failed to find location", locationResult.error),
    );
  }

  const location = locationResult.value;
  if (!location) {
    return err(new ApplicationError("Location not found"));
  }

  // Check if user owns the region (only region owners can delete locations)
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

  if (region.creatorId !== user.id) {
    return err(
      new AuthorizationError("Only region owner can delete locations"),
    );
  }

  // Delete location (this will cascade to related data like check-ins, favorites, etc.)
  const deleteResult = await context.locationRepository.delete(locationId);

  return deleteResult.mapErr(
    (error) => new ApplicationError("Failed to delete location", error),
  );
}
