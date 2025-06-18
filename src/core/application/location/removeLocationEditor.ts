import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { type Result, err, ok } from "neverthrow";
import { z } from "zod/v4";
import type { LocationId } from "../../domain/location/types";
import type { UserId } from "../../domain/user/types";
import type { Context } from "../context";

export const removeLocationEditorInputSchema = z.object({
  locationId: z.string().uuid(),
  editorId: z.string().uuid(),
});
export type RemoveLocationEditorInput = z.infer<
  typeof removeLocationEditorInputSchema
>;

export async function removeLocationEditor(
  context: Context,
  userId: UserId,
  input: RemoveLocationEditorInput,
): Promise<Result<void, ApplicationError>> {
  // Validate input
  const parseResult = validate(removeLocationEditorInputSchema, input);
  if (parseResult.isErr()) {
    return err(new ApplicationError("Invalid input", parseResult.error));
  }

  const { locationId, editorId } = parseResult.value;

  // Check if location exists
  const locationResult = await context.locationRepository.findById(
    locationId as LocationId,
  );
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
    return err(new ApplicationError("Only region owner can remove editors"));
  }

  // Check if the editor exists for this location
  const isEditorResult = await context.locationRepository.isUserEditor(
    location.id,
    editorId as UserId,
  );
  if (isEditorResult.isErr()) {
    return err(
      new ApplicationError(
        "Failed to check editor status",
        isEditorResult.error,
      ),
    );
  }

  if (!isEditorResult.value) {
    return err(new ApplicationError("User is not an editor of this location"));
  }

  // Remove the editor
  const removeResult = await context.locationRepository.removeEditor(
    location.id,
    editorId as UserId,
  );
  if (removeResult.isErr()) {
    return err(
      new ApplicationError("Failed to remove editor", removeResult.error),
    );
  }

  return ok(undefined);
}
