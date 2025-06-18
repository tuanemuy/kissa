import { ApplicationError } from "@/lib/error";
import { type Result, err, ok } from "neverthrow";
import type { LocationEditor } from "../../domain/location/types";
import type { UserId } from "../../domain/user/types";
import type { Context } from "../context";

export type UserInvitationWithDetails = LocationEditor & {
  locationName: string;
  regionName: string;
  isPending: boolean;
};

export async function listUserInvitations(
  context: Context,
  userId: UserId,
): Promise<Result<UserInvitationWithDetails[], ApplicationError>> {
  // Get all editor invitations for the user
  const editorsResult =
    await context.locationRepository.findEditorsByUser(userId);
  if (editorsResult.isErr()) {
    return err(
      new ApplicationError(
        "Failed to list user invitations",
        editorsResult.error,
      ),
    );
  }

  const editors = editorsResult.value;

  // Get location and region details for each invitation
  const invitationsWithDetails = await Promise.all(
    editors.map(async (editor): Promise<UserInvitationWithDetails | null> => {
      // Get location details
      const locationResult = await context.locationRepository.findById(
        editor.locationId,
      );
      if (locationResult.isErr() || !locationResult.value) {
        return null;
      }

      const location = locationResult.value;

      // Get region details
      const regionResult = await context.regionRepository.findById(
        location.regionId,
      );
      if (regionResult.isErr() || !regionResult.value) {
        return null;
      }

      const region = regionResult.value;

      return {
        ...editor,
        locationName: location.name,
        regionName: region.name,
        isPending: !editor.acceptedAt,
      };
    }),
  );

  // Filter out any null results and sort by invitation date (newest first)
  const validInvitations = invitationsWithDetails
    .filter(
      (invitation): invitation is UserInvitationWithDetails =>
        invitation !== null,
    )
    .sort(
      (a, b) =>
        new Date(b.invitedAt).getTime() - new Date(a.invitedAt).getTime(),
    );

  return ok(validInvitations);
}
