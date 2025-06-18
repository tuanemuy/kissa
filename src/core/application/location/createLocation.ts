import type { Location } from "@/core/domain/location/types";
import { createLocationParamsSchema } from "@/core/domain/location/types";
import type { RegionId } from "@/core/domain/region/types";
import type { UserId } from "@/core/domain/user/types";
import { getSubscriptionLimit } from "@/core/domain/user/types";
import { ApplicationError, AuthorizationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { type Result, err, ok } from "neverthrow";
import type { z } from "zod/v4";
import type { Context } from "../context";

export const createLocationInputSchema = createLocationParamsSchema.omit({
  regionId: true,
});
export type CreateLocationInput = z.infer<typeof createLocationInputSchema>;

export async function createLocation(
  context: Context,
  creatorId: UserId,
  regionId: RegionId,
  input: CreateLocationInput,
): Promise<Result<Location, ApplicationError | AuthorizationError>> {
  const parseResult = validate(createLocationInputSchema, input);
  if (parseResult.isErr()) {
    return err(
      new ApplicationError("Invalid location input", parseResult.error),
    );
  }

  // Get creator user to check role and subscription
  const userResult = await context.userRepository.findById(creatorId);
  if (userResult.isErr()) {
    return err(
      new ApplicationError("Failed to find creator", userResult.error),
    );
  }

  const creator = userResult.value;
  if (!creator) {
    return err(new ApplicationError("Creator not found"));
  }

  // Check if user has editor role
  if (creator.role !== "editor") {
    return err(new AuthorizationError("Only editors can create locations"));
  }

  // Check if region exists and user owns it
  const regionResult = await context.regionRepository.findById(regionId);
  if (regionResult.isErr()) {
    return err(
      new ApplicationError("Failed to find region", regionResult.error),
    );
  }

  const region = regionResult.value;
  if (!region) {
    return err(new ApplicationError("Region not found"));
  }

  if (region.creatorId !== creator.id) {
    return err(
      new AuthorizationError(
        "Only region owner can create locations in this region",
      ),
    );
  }

  // Check subscription limits - count locations by region for this user's regions
  const [currentRegionCountResult, currentLocationCountResult] =
    await Promise.all([
      context.regionRepository.countByCreator(creator.id),
      context.locationRepository.countByRegion(regionId),
    ]);

  if (currentRegionCountResult.isErr()) {
    return err(
      new ApplicationError(
        "Failed to check region count",
        currentRegionCountResult.error,
      ),
    );
  }

  if (currentLocationCountResult.isErr()) {
    return err(
      new ApplicationError(
        "Failed to check location count",
        currentLocationCountResult.error,
      ),
    );
  }

  const subscriptionLimit = getSubscriptionLimit(creator.subscription);
  const currentLocationCount = currentLocationCountResult.value;

  if (currentLocationCount >= subscriptionLimit.locations) {
    return err(
      new AuthorizationError(
        `Location limit exceeded. ${creator.subscription} plan allows ${subscriptionLimit.locations} locations per region.`,
      ),
    );
  }

  // Create location
  const createResult = await context.locationRepository.create({
    regionId: regionId,
    name: parseResult.value.name,
    description: parseResult.value.description,
    category: parseResult.value.category,
    address: parseResult.value.address,
    latitude: parseResult.value.latitude,
    longitude: parseResult.value.longitude,
    contactInfo: parseResult.value.contactInfo,
    operatingHours: parseResult.value.operatingHours,
    isPublic: parseResult.value.isPublic ?? false,
    coverPhotoUrl: parseResult.value.coverPhotoUrl,
  });

  return createResult.mapErr(
    (error) => new ApplicationError("Failed to create location", error),
  );
}
