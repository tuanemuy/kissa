import { type Result, err, ok } from "neverthrow";
import { z } from "zod/v4";

import type { CheckInId } from "@/core/domain/checkIn/types";
import type { UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";

import type { Context } from "../context";

export const deleteCheckInInputSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(), // For authorization
});
export type DeleteCheckInInput = z.infer<typeof deleteCheckInInputSchema>;

export async function deleteCheckIn(
  context: Context,
  input: DeleteCheckInInput,
): Promise<Result<void, ApplicationError>> {
  const parseResult = validate(deleteCheckInInputSchema, input);
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
    return err(new ApplicationError("Unauthorized to delete this check-in"));
  }

  // Delete check-in
  const result = await context.checkInRepository.delete(params.id as CheckInId);
  if (result.isErr()) {
    return err(new ApplicationError("Failed to delete check-in", result.error));
  }

  return ok(undefined);
}
