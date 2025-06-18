import { moderateContentParamsSchema } from "@/core/domain/moderation/types";
import type { ModerationItem } from "@/core/domain/moderation/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { type Result, err, ok } from "neverthrow";
import type { z } from "zod/v4";
import type { Context } from "../context";

export const moderateContentInputSchema = moderateContentParamsSchema;
export type ModerateContentInput = z.infer<typeof moderateContentInputSchema>;

export async function moderateContent(
  context: Context,
  input: ModerateContentInput,
): Promise<Result<ModerationItem, ApplicationError>> {
  const parseResult = validate(moderateContentInputSchema, input);
  if (parseResult.isErr()) {
    return err(
      new ApplicationError("Invalid moderate content input", parseResult.error),
    );
  }

  const params = parseResult.value;

  // Verify moderator user exists
  const moderatorResult = await context.userRepository.findById(
    params.moderatedBy,
  );
  if (moderatorResult.isErr()) {
    return err(
      new ApplicationError("Failed to verify moderator", moderatorResult.error),
    );
  }

  const moderator = moderatorResult.value;
  if (!moderator) {
    return err(new ApplicationError("Moderator not found"));
  }

  // TODO: Add role verification to ensure user can moderate content
  // This would require a role system implementation

  // Verify moderation item exists
  const moderationResult = await context.moderationRepository.findById(
    params.id,
  );
  if (moderationResult.isErr()) {
    return err(
      new ApplicationError(
        "Failed to find moderation item",
        moderationResult.error,
      ),
    );
  }

  const moderation = moderationResult.value;
  if (!moderation) {
    return err(new ApplicationError("Moderation item not found"));
  }

  if (moderation.status !== "pending") {
    return err(new ApplicationError("Content has already been moderated"));
  }

  // Update moderation status
  const updateResult = await context.moderationRepository.moderate(params);
  if (updateResult.isErr()) {
    return err(
      new ApplicationError(
        "Failed to update moderation status",
        updateResult.error,
      ),
    );
  }

  const updatedModeration = updateResult.value;

  // Notify the reporter if they exist
  if (moderation.reportedBy) {
    const notificationTitle =
      params.status === "approved"
        ? "Content Report Resolved - Approved"
        : "Content Report Resolved - Rejected";

    const notificationMessage =
      params.status === "approved"
        ? "The content you reported has been reviewed and approved."
        : "The content you reported has been reviewed and found to violate our guidelines.";

    await context.notificationRepository.create({
      userId: moderation.reportedBy,
      type: "content_moderation",
      title: notificationTitle,
      message: notificationMessage,
      data: {
        moderationItemId: updatedModeration.id,
        contentType: moderation.contentType,
        contentId: moderation.contentId,
        status: params.status,
      },
    });
  }

  // If content is rejected, we might want to take additional actions
  // like hiding the content or notifying the content creator
  if (params.status === "rejected") {
    // TODO: Implement content hiding/removal logic
    // This would depend on the specific content type and business rules
  }

  return ok(updatedModeration);
}
