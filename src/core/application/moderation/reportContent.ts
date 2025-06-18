import { createModerationItemParamsSchema } from "@/core/domain/moderation/types";
import type { ModerationItem } from "@/core/domain/moderation/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { type Result, err, ok } from "neverthrow";
import type { z } from "zod/v4";
import type { Context } from "../context";

export const reportContentInputSchema = createModerationItemParamsSchema;
export type ReportContentInput = z.infer<typeof reportContentInputSchema>;

export async function reportContent(
  context: Context,
  input: ReportContentInput,
): Promise<Result<ModerationItem, ApplicationError>> {
  const parseResult = validate(reportContentInputSchema, input);
  if (parseResult.isErr()) {
    return err(
      new ApplicationError("Invalid report content input", parseResult.error),
    );
  }

  const params = parseResult.value;

  // Verify reporting user exists if provided
  if (params.reportedBy) {
    const userResult = await context.userRepository.findById(params.reportedBy);
    if (userResult.isErr()) {
      return err(
        new ApplicationError(
          "Failed to verify reporting user",
          userResult.error,
        ),
      );
    }

    const user = userResult.value;
    if (!user) {
      return err(new ApplicationError("Reporting user not found"));
    }
  }

  // Check if content is already under moderation
  const existingModerationResult =
    await context.moderationRepository.findByContent(
      params.contentType,
      params.contentId,
    );

  if (existingModerationResult.isErr()) {
    return err(
      new ApplicationError(
        "Failed to check existing moderation",
        existingModerationResult.error,
      ),
    );
  }

  const existingModeration = existingModerationResult.value;
  if (existingModeration && existingModeration.status === "pending") {
    // Return existing moderation item if still pending
    return ok(existingModeration);
  }

  // Create new moderation item
  const createResult = await context.moderationRepository.create(params);
  if (createResult.isErr()) {
    return err(
      new ApplicationError(
        "Failed to create moderation item",
        createResult.error,
      ),
    );
  }

  const moderationItem = createResult.value;

  // Send notification to moderation team (system notification)
  if (params.reportedBy) {
    await context.notificationRepository.create({
      userId: params.reportedBy,
      type: "content_moderation",
      title: "Content Report Submitted",
      message: `Content of type ${params.contentType} has been reported for moderation.`,
      data: {
        moderationItemId: moderationItem.id,
        contentType: params.contentType,
        contentId: params.contentId,
      },
    });
  }

  return ok(moderationItem);
}
