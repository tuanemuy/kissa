import { type Result, err, ok } from "neverthrow";
import { z } from "zod/v4";

import type {
  Region,
  RegionId,
  UpdateRegionParams,
} from "@/core/domain/region/types";
import type { UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";

import type { Context } from "../context";

export const updateRegionInputSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(), // For authorization
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  isPublic: z.boolean().optional(),
  coverPhotoUrl: z.string().url().nullable().optional(),
});
export type UpdateRegionInput = z.infer<typeof updateRegionInputSchema>;

export async function updateRegion(
  context: Context,
  input: UpdateRegionInput,
): Promise<Result<Region, ApplicationError>> {
  const parseResult = validate(updateRegionInputSchema, input);
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
    return err(new ApplicationError("Unauthorized to update this region"));
  }

  // Update region
  const updateParams: UpdateRegionParams = {
    id: params.id as RegionId,
    name: params.name,
    description: params.description,
    isPublic: params.isPublic,
    coverPhotoUrl: params.coverPhotoUrl,
  };

  const result = await context.regionRepository.update(updateParams);
  if (result.isErr()) {
    return err(new ApplicationError("Failed to update region", result.error));
  }

  return ok(result.value);
}
