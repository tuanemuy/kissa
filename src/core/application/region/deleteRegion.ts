import { type Result, err, ok } from "neverthrow";
import { z } from "zod/v4";

import type { RegionId } from "@/core/domain/region/types";
import type { UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";

import type { Context } from "../context";

export const deleteRegionInputSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(), // For authorization
});
export type DeleteRegionInput = z.infer<typeof deleteRegionInputSchema>;

export async function deleteRegion(
  context: Context,
  input: DeleteRegionInput,
): Promise<Result<void, ApplicationError>> {
  const parseResult = validate(deleteRegionInputSchema, input);
  if (parseResult.isErr()) {
    return err(new ApplicationError("Invalid region input", parseResult.error));
  }

  const params = parseResult.value;

  // Verify region exists and user owns it
  const regionResult = await context.regionRepository.findById(
    params.id as RegionId,
  );
  if (regionResult.isErr()) {
    return err(
      new ApplicationError("Failed to find region", regionResult.error),
    );
  }

  if (!regionResult.value) {
    return err(new ApplicationError("Region not found"));
  }

  // Verify ownership
  if (regionResult.value.creatorId !== (params.userId as UserId)) {
    return err(new ApplicationError("Unauthorized to delete this region"));
  }

  // Check if region has locations - prevent deletion if it has locations
  const locationCount = await context.locationRepository.countByRegion(
    params.id as RegionId,
  );
  if (locationCount.isErr()) {
    return err(
      new ApplicationError(
        "Failed to check region locations",
        locationCount.error,
      ),
    );
  }

  if (locationCount.value > 0) {
    return err(
      new ApplicationError(
        "Cannot delete region with existing locations. Please delete all locations first.",
      ),
    );
  }

  // Delete region
  const result = await context.regionRepository.delete(params.id as RegionId);
  if (result.isErr()) {
    return err(new ApplicationError("Failed to delete region", result.error));
  }

  return ok(undefined);
}
