import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { type Result, err, ok } from "neverthrow";
import { z } from "zod/v4";
import {
  type InviteLocationEditorParams,
  type LocationEditor,
  locationIdSchema,
} from "../../domain/location/types";
import type { UserId } from "../../domain/user/types";
import type { Context } from "../context";

export const inviteLocationEditorInputSchema = z.object({
  locationId: locationIdSchema,
  editorEmail: z.string().email(),
});
export type InviteLocationEditorInput = z.infer<
  typeof inviteLocationEditorInputSchema
>;

export async function inviteLocationEditor(
  context: Context,
  userId: UserId,
  input: InviteLocationEditorInput,
): Promise<Result<LocationEditor, ApplicationError>> {
  // Validate input
  const parseResult = validate(inviteLocationEditorInputSchema, input);
  if (parseResult.isErr()) {
    return err(new ApplicationError("Invalid input", parseResult.error));
  }

  const { locationId, editorEmail } = parseResult.value;

  // Check if location exists
  const locationResult = await context.locationRepository.findById(locationId);
  if (locationResult.isErr()) {
    return err(
      new ApplicationError("Failed to find location", locationResult.error),
    );
  }

  const location = locationResult.value;
  if (!location) {
    return err(new ApplicationError("Location not found"));
  }

  // Check if user is owner of the location's region
  const regionResult = await context.regionRepository.findById(
    location.regionId,
  );
  if (regionResult.isErr()) {
    return err(
      new ApplicationError("Failed to find region", regionResult.error),
    );
  }

  const region = regionResult.value;
  if (!region) {
    return err(new ApplicationError("Region not found"));
  }

  if (region.creatorId !== userId) {
    return err(new ApplicationError("Only region owner can invite editors"));
  }

  // Find the user to invite by email
  const userResult = await context.userRepository.findByEmail(editorEmail);
  if (userResult.isErr()) {
    return err(new ApplicationError("Failed to find user", userResult.error));
  }

  const editorUser = userResult.value;
  if (!editorUser) {
    return err(new ApplicationError("User with this email not found"));
  }

  // Check if user is already an editor
  const isEditorResult = await context.locationRepository.isUserEditor(
    location.id,
    editorUser.id,
  );
  if (isEditorResult.isErr()) {
    return err(
      new ApplicationError(
        "Failed to check editor status",
        isEditorResult.error,
      ),
    );
  }

  if (isEditorResult.value) {
    return err(
      new ApplicationError("User is already an editor of this location"),
    );
  }

  // Invite the editor
  const inviteParams: InviteLocationEditorParams & { editorId: UserId } = {
    locationId: location.id,
    editorEmail,
    invitedBy: userId,
    editorId: editorUser.id,
  };

  const inviteResult =
    await context.locationRepository.inviteEditor(inviteParams);
  if (inviteResult.isErr()) {
    return err(
      new ApplicationError("Failed to invite editor", inviteResult.error),
    );
  }

  // Send notification email
  const emailResult = await context.notificationService.sendEmail({
    to: editorEmail,
    subject: "You've been invited to edit a location",
    body: `You have been invited to edit the location "${location.name}" in the region "${region.name}". Please log in to your account to accept or decline this invitation.`,
    html: `
      <h2>Location Editor Invitation</h2>
      <p>You have been invited to edit the location <strong>"${location.name}"</strong> in the region <strong>"${region.name}"</strong>.</p>
      <p>Please log in to your account to accept or decline this invitation.</p>
    `,
  });

  if (emailResult.isErr()) {
    // Log the error but don't fail the invitation
    console.error("Failed to send invitation email:", emailResult.error);
  }

  return ok(inviteResult.value);
}
