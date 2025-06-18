import { moderationItemIdSchema } from "@/core/domain/moderation/types";
import type {
  ModerationItem,
  ModerationItemId,
} from "@/core/domain/moderation/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { type Result, err, ok } from "neverthrow";
import type { z } from "zod/v4";
import type { Context } from "../context";

export const getModerationItemInputSchema = moderationItemIdSchema;
export type GetModerationItemInput = z.infer<
  typeof getModerationItemInputSchema
>;

export async function getModerationItem(
  context: Context,
  input: GetModerationItemInput,
): Promise<Result<ModerationItem | null, ApplicationError>> {
  const parseResult = validate(getModerationItemInputSchema, input);
  if (parseResult.isErr()) {
    return err(
      new ApplicationError("Invalid moderation item ID", parseResult.error),
    );
  }

  const id = parseResult.value as ModerationItemId;

  const result = await context.moderationRepository.findById(id);
  if (result.isErr()) {
    return err(
      new ApplicationError("Failed to get moderation item", result.error),
    );
  }

  return ok(result.value);
}
