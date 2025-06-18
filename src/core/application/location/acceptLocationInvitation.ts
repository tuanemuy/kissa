import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { type Result, err, ok } from "neverthrow";
import { z } from "zod/v4";
import type {
  LocationEditor,
  LocationEditorId,
} from "../../domain/location/types";
import type { UserId } from "../../domain/user/types";
import type { Context } from "../context";

export const acceptLocationInvitationInputSchema = z.object({
  locationEditorId: z.string().uuid(),
});
export type AcceptLocationInvitationInput = z.infer<
  typeof acceptLocationInvitationInputSchema
>;

export async function acceptLocationInvitation(
  context: Context,
  userId: UserId,
  input: AcceptLocationInvitationInput,
): Promise<Result<LocationEditor, ApplicationError>> {
  // Validate input
  const parseResult = validate(acceptLocationInvitationInputSchema, input);
  if (parseResult.isErr()) {
    return err(new ApplicationError("Invalid input", parseResult.error));
  }

  const { locationEditorId } = parseResult.value;

  // Find the invitation
  const editorsResult =
    await context.locationRepository.findEditorsByUser(userId);
  if (editorsResult.isErr()) {
    return err(
      new ApplicationError("Failed to find invitations", editorsResult.error),
    );
  }

  const invitation = editorsResult.value.find(
    (editor) => editor.id === locationEditorId && editor.acceptedAt === null,
  );

  if (!invitation) {
    return err(
      new ApplicationError("Invitation not found or already accepted"),
    );
  }

  // Accept the invitation
  const acceptResult = await context.locationRepository.acceptInvitation(
    locationEditorId as LocationEditorId,
  );
  if (acceptResult.isErr()) {
    return err(
      new ApplicationError("Failed to accept invitation", acceptResult.error),
    );
  }

  return ok(acceptResult.value);
}
