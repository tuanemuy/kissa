import type { Location, LocationId } from "@/core/domain/location/types";
import { updateLocationParamsSchema } from "@/core/domain/location/types";
import type { UserId } from "@/core/domain/user/types";
import { ApplicationError, AuthorizationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { type Result, err } from "neverthrow";
import type { z } from "zod/v4";
import type { Context } from "../context";

export const updateLocationInputSchema = updateLocationParamsSchema.omit({
  id: true,
});
export type UpdateLocationInput = z.infer<typeof updateLocationInputSchema>;

export async function updateLocation(
  context: Context,
  userId: UserId,
  locationId: LocationId,
  input: UpdateLocationInput,
): Promise<Result<Location, ApplicationError | AuthorizationError>> {
  const parseResult = validate(updateLocationInputSchema, input);
  if (parseResult.isErr()) {
    return err(
      new ApplicationError("Invalid location input", parseResult.error),
    );
  }

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
    return err(new AuthorizationError("Only editors can update locations"));
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

  // Check if user owns the region or has editor permissions
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

  // Check authorization: either region owner or location editor
  const isRegionOwner = region.creatorId === user.id;
  let isLocationEditor = false;

  if (!isRegionOwner) {
    const isEditorResult = await context.locationRepository.isUserEditor(
      locationId,
      user.id,
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
      new AuthorizationError(
        "Only location owner or editors can update this location",
      ),
    );
  }

  // Update location
  const updateResult = await context.locationRepository.update({
    id: locationId,
    ...parseResult.value,
  });

  return updateResult.mapErr(
    (error) => new ApplicationError("Failed to update location", error),
  );
}
