import { type Result, err, ok } from "neverthrow";
import { z } from "zod/v4";

import type {
  CheckIn,
  CheckInId,
  UpdateCheckInParams,
} from "@/core/domain/checkIn/types";
import type { UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";

import type { Context } from "../context";

export const updateCheckInInputSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(), // For authorization
  photoUrl: z.string().url().nullable().optional(),
  comment: z.string().max(500).nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  isPublic: z.boolean().optional(),
});
export type UpdateCheckInInput = z.infer<typeof updateCheckInInputSchema>;

export async function updateCheckIn(
  context: Context,
  input: UpdateCheckInInput,
): Promise<Result<CheckIn, ApplicationError>> {
  const parseResult = validate(updateCheckInInputSchema, input);
  if (parseResult.isErr()) {
    return err(
      new ApplicationError("Invalid check-in input", parseResult.error),
    );
  }

  const params = parseResult.value;

  // Verify check-in exists and user owns it
  const checkInResult = await context.checkInRepository.findById(
    params.id as CheckInId,
  );
  if (checkInResult.isErr()) {
    return err(
      new ApplicationError("Failed to find check-in", checkInResult.error),
    );
  }

  if (!checkInResult.value) {
    return err(new ApplicationError("Check-in not found"));
  }

  // Verify ownership
  if (checkInResult.value.userId !== (params.userId as UserId)) {
    return err(new ApplicationError("Unauthorized to update this check-in"));
  }

  // Update check-in
  const updateParams: UpdateCheckInParams = {
    id: params.id as CheckInId,
    photoUrl: params.photoUrl,
    comment: params.comment,
    rating: params.rating,
    isPublic: params.isPublic,
  };

  const result = await context.checkInRepository.update(updateParams);
  if (result.isErr()) {
    return err(new ApplicationError("Failed to update check-in", result.error));
  }

  return ok(result.value);
}
