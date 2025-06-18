import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { type Result, err, ok } from "neverthrow";
import { z } from "zod/v4";
import type { LocationEditor, LocationId } from "../../domain/location/types";
import type { UserId } from "../../domain/user/types";
import type { Context } from "../context";

export const listLocationEditorsInputSchema = z.object({
  locationId: z.string().uuid(),
});
export type ListLocationEditorsInput = z.infer<
  typeof listLocationEditorsInputSchema
>;

export async function listLocationEditors(
  context: Context,
  userId: UserId,
  input: ListLocationEditorsInput,
): Promise<Result<LocationEditor[], ApplicationError>> {
  // Validate input
  const parseResult = validate(listLocationEditorsInputSchema, input);
  if (parseResult.isErr()) {
    return err(new ApplicationError("Invalid input", parseResult.error));
  }

  const { locationId } = parseResult.value;

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

  // Check if user has permission to view editors (region owner or location editor)
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

  const isOwner = region.creatorId === userId;
  const isEditorResult = await context.locationRepository.isUserEditor(
    location.id,
    userId,
  );
  if (isEditorResult.isErr()) {
    return err(
      new ApplicationError(
        "Failed to check editor status",
        isEditorResult.error,
      ),
    );
  }

  if (!isOwner && !isEditorResult.value) {
    return err(new ApplicationError("Permission denied"));
  }

  // Get editors list
  const editorsResult = await context.locationRepository.findEditorsByLocation(
    location.id,
  );
  if (editorsResult.isErr()) {
    return err(
      new ApplicationError("Failed to list editors", editorsResult.error),
    );
  }

  return ok(editorsResult.value);
}
