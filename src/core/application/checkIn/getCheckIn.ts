import { type Result, err, ok } from "neverthrow";
import { z } from "zod/v4";

import type {
  CheckIn,
  CheckInId,
  CheckInWithLocation,
  CheckInWithUser,
} from "@/core/domain/checkIn/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";

import type { Context } from "../context";

export const getCheckInInputSchema = z.object({
  id: z.string().uuid(),
});
export type GetCheckInInput = z.infer<typeof getCheckInInputSchema>;

export async function getCheckIn(
  context: Context,
  input: GetCheckInInput,
): Promise<Result<CheckIn | null, ApplicationError>> {
  const parseResult = validate(getCheckInInputSchema, input);
  if (parseResult.isErr()) {
    return err(new ApplicationError("Invalid input", parseResult.error));
  }

  const result = await context.checkInRepository.findById(
    input.id as CheckInId,
  );
  if (result.isErr()) {
    return err(new ApplicationError("Failed to get check-in", result.error));
  }

  return ok(result.value);
}

export async function getCheckInWithUser(
  context: Context,
  input: GetCheckInInput,
): Promise<Result<CheckInWithUser | null, ApplicationError>> {
  const parseResult = validate(getCheckInInputSchema, input);
  if (parseResult.isErr()) {
    return err(new ApplicationError("Invalid input", parseResult.error));
  }

  const result = await context.checkInRepository.findByIdWithUser(
    input.id as CheckInId,
  );
  if (result.isErr()) {
    return err(
      new ApplicationError("Failed to get check-in with user", result.error),
    );
  }

  return ok(result.value);
}

export async function getCheckInWithLocation(
  context: Context,
  input: GetCheckInInput,
): Promise<Result<CheckInWithLocation | null, ApplicationError>> {
  const parseResult = validate(getCheckInInputSchema, input);
  if (parseResult.isErr()) {
    return err(new ApplicationError("Invalid input", parseResult.error));
  }

  const result = await context.checkInRepository.findByIdWithLocation(
    input.id as CheckInId,
  );
  if (result.isErr()) {
    return err(
      new ApplicationError(
        "Failed to get check-in with location",
        result.error,
      ),
    );
  }

  return ok(result.value);
}
