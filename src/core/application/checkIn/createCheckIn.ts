import { type Result, err, ok } from "neverthrow";
import { z } from "zod/v4";

import type { CheckIn, CreateCheckInParams } from "@/core/domain/checkIn/types";
import type { LocationId } from "@/core/domain/location/types";
import type { UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";

import type { Context } from "../context";

export const createCheckInInputSchema = z.object({
  userId: z.string().uuid(),
  locationId: z.string().uuid(),
  photoUrl: z.string().url().optional(),
  comment: z.string().max(500).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  isPublic: z.boolean().optional().default(true),
});
export type CreateCheckInInput = z.infer<typeof createCheckInInputSchema>;

export async function createCheckIn(
  context: Context,
  input: CreateCheckInInput,
): Promise<Result<CheckIn, ApplicationError>> {
  const parseResult = validate(createCheckInInputSchema, input);
  if (parseResult.isErr()) {
    return err(
      new ApplicationError("Invalid check-in input", parseResult.error),
    );
  }

  const params = parseResult.value;

  // Verify location exists
  const locationResult = await context.locationRepository.findById(
    params.locationId as LocationId,
  );
  if (locationResult.isErr()) {
    return err(
      new ApplicationError("Failed to verify location", locationResult.error),
    );
  }

  if (!locationResult.value) {
    return err(new ApplicationError("Location not found"));
  }

  // Verify user exists
  const userResult = await context.userRepository.findById(
    params.userId as UserId,
  );
  if (userResult.isErr()) {
    return err(new ApplicationError("Failed to verify user", userResult.error));
  }

  if (!userResult.value) {
    return err(new ApplicationError("User not found"));
  }

  // Create check-in
  const createParams: CreateCheckInParams = {
    userId: params.userId as UserId,
    locationId: params.locationId as LocationId,
    photoUrl: params.photoUrl,
    comment: params.comment,
    rating: params.rating,
    isPublic: params.isPublic,
  };

  const result = await context.checkInRepository.create(createParams);
  if (result.isErr()) {
    return err(new ApplicationError("Failed to create check-in", result.error));
  }

  return ok(result.value);
}
