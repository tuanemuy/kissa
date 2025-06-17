import type { Region } from "@/core/domain/region/types";
import { createRegionParamsSchema } from "@/core/domain/region/types";
import type { UserId } from "@/core/domain/user/types";
import { getSubscriptionLimit } from "@/core/domain/user/types";
import { ApplicationError, AuthorizationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { type Result, err, ok } from "neverthrow";
import type { z } from "zod";
import type { Context } from "../context";

export const createRegionInputSchema = createRegionParamsSchema.omit({
  creatorId: true,
});
export type CreateRegionInput = z.infer<typeof createRegionInputSchema>;

export async function createRegion(
  context: Context,
  creatorId: UserId,
  input: CreateRegionInput,
): Promise<Result<Region, ApplicationError | AuthorizationError>> {
  const parseResult = validate(createRegionInputSchema, input);
  if (parseResult.isErr()) {
    return err(new ApplicationError("Invalid region input", parseResult.error));
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
    return err(new AuthorizationError("Only editors can create regions"));
  }

  // Check subscription limits
  const currentRegionCountResult =
    await context.regionRepository.countByCreator(creator.id);
  if (currentRegionCountResult.isErr()) {
    return err(
      new ApplicationError(
        "Failed to check region count",
        currentRegionCountResult.error,
      ),
    );
  }

  const currentRegionCount = currentRegionCountResult.value;
  const subscriptionLimit = getSubscriptionLimit(creator.subscription);

  if (currentRegionCount >= subscriptionLimit.regions) {
    return err(
      new AuthorizationError(
        `Region limit exceeded. ${creator.subscription} plan allows ${subscriptionLimit.regions} regions.`,
      ),
    );
  }

  // Create region
  const createResult = await context.regionRepository.create({
    name: parseResult.value.name,
    description: parseResult.value.description,
    isPublic: parseResult.value.isPublic ?? false,
    coverPhotoUrl: parseResult.value.coverPhotoUrl,
    creatorId: creator.id,
  });

  return createResult.mapErr(
    (error) => new ApplicationError("Failed to create region", error),
  );
}
