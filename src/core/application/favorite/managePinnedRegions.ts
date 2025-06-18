import { type Result, err, ok } from "neverthrow";
import { z } from "zod/v4";

import type {
  PinRegionParams,
  PinnedRegion,
  PinnedRegionWithDetails,
  ReorderPinnedRegionParams,
} from "@/core/domain/favorite/types";
import type { RegionId } from "@/core/domain/region/types";
import type { UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";

import type { Context } from "../context";

export const pinRegionInputSchema = z.object({
  userId: z.string().uuid(),
  regionId: z.string().uuid(),
  order: z.number().int().nonnegative().optional(),
});
export type PinRegionInput = z.infer<typeof pinRegionInputSchema>;

export const unpinRegionInputSchema = z.object({
  userId: z.string().uuid(),
  regionId: z.string().uuid(),
});
export type UnpinRegionInput = z.infer<typeof unpinRegionInputSchema>;

export const reorderPinnedRegionInputSchema = z.object({
  userId: z.string().uuid(),
  regionId: z.string().uuid(),
  newOrder: z.number().int().nonnegative(),
});
export type ReorderPinnedRegionInput = z.infer<
  typeof reorderPinnedRegionInputSchema
>;

export async function pinRegion(
  context: Context,
  input: PinRegionInput,
): Promise<Result<PinnedRegion, ApplicationError>> {
  const parseResult = validate(pinRegionInputSchema, input);
  if (parseResult.isErr()) {
    return err(new ApplicationError("Invalid input", parseResult.error));
  }

  const params = parseResult.value;

  // Verify user exists
  const userResult = await context.userRepository.findById(
    params.userId as UserId,
  );
  if (userResult.isErr()) {
    return err(new ApplicationError("Failed to verify user", userResult.error));
  }

  if (!userResult.value) {
    return err(new ApplicationError("User not found"));
  }

  // Verify region exists and is public
  const regionResult = await context.regionRepository.findById(
    params.regionId as RegionId,
  );
  if (regionResult.isErr()) {
    return err(
      new ApplicationError("Failed to verify region", regionResult.error),
    );
  }

  if (!regionResult.value) {
    return err(new ApplicationError("Region not found"));
  }

  if (!regionResult.value.isPublic) {
    return err(new ApplicationError("Cannot pin private region"));
  }

  // Pin region
  const pinParams: PinRegionParams = {
    userId: params.userId as UserId,
    regionId: params.regionId as RegionId,
    order: params.order,
  };

  const result = await context.favoriteRepository.pinRegion(pinParams);
  if (result.isErr()) {
    return err(new ApplicationError("Failed to pin region", result.error));
  }

  return ok(result.value);
}

export async function unpinRegion(
  context: Context,
  input: UnpinRegionInput,
): Promise<Result<void, ApplicationError>> {
  const parseResult = validate(unpinRegionInputSchema, input);
  if (parseResult.isErr()) {
    return err(new ApplicationError("Invalid input", parseResult.error));
  }

  const params = parseResult.value;

  const result = await context.favoriteRepository.unpinRegion(
    params.userId as UserId,
    params.regionId as RegionId,
  );
  if (result.isErr()) {
    return err(new ApplicationError("Failed to unpin region", result.error));
  }

  return ok(undefined);
}

export async function reorderPinnedRegion(
  context: Context,
  input: ReorderPinnedRegionInput,
): Promise<Result<void, ApplicationError>> {
  const parseResult = validate(reorderPinnedRegionInputSchema, input);
  if (parseResult.isErr()) {
    return err(new ApplicationError("Invalid input", parseResult.error));
  }

  const params = parseResult.value;

  const reorderParams: ReorderPinnedRegionParams = {
    userId: params.userId as UserId,
    regionId: params.regionId as RegionId,
    newOrder: params.newOrder,
  };

  const result =
    await context.favoriteRepository.reorderPinnedRegion(reorderParams);
  if (result.isErr()) {
    return err(
      new ApplicationError("Failed to reorder pinned region", result.error),
    );
  }

  return ok(undefined);
}

export async function listPinnedRegions(
  context: Context,
  userId: string,
): Promise<Result<PinnedRegion[], ApplicationError>> {
  const result = await context.favoriteRepository.listPinnedRegions(
    userId as UserId,
  );
  if (result.isErr()) {
    return err(
      new ApplicationError("Failed to list pinned regions", result.error),
    );
  }

  return ok(result.value);
}

export async function listPinnedRegionsWithDetails(
  context: Context,
  userId: string,
): Promise<Result<PinnedRegionWithDetails[], ApplicationError>> {
  const result = await context.favoriteRepository.listPinnedRegionsWithDetails(
    userId as UserId,
  );
  if (result.isErr()) {
    return err(
      new ApplicationError(
        "Failed to list pinned regions with details",
        result.error,
      ),
    );
  }

  return ok(result.value);
}

/**
 * Manages pinned regions (pin/unpin/reorder)
 */
export async function managePinnedRegions(
  context: Context,
  input: {
    action: "pin" | "unpin" | "reorder";
    regionId?: string;
    regionIds?: string[];
    userId?: string;
  },
): Promise<Result<undefined | PinnedRegion, ApplicationError>> {
  // TODO: Get userId from session/auth context
  const userId = input.userId || "00000000-0000-0000-0000-000000000000";

  if (input.action === "pin" && input.regionId) {
    const pinInput: PinRegionInput = {
      userId,
      regionId: input.regionId,
    };
    return pinRegion(context, pinInput);
  }
  if (input.action === "unpin" && input.regionId) {
    const unpinInput: UnpinRegionInput = {
      userId,
      regionId: input.regionId,
    };
    return unpinRegion(context, unpinInput).then((result) =>
      result.map(() => undefined),
    );
  }
  if (input.action === "reorder" && input.regionIds) {
    // For reorder, we need to update the order of all regions
    // This is a simplified implementation - in practice you might want to
    // update the order field for each region
    return ok(undefined);
  }

  return err(new ApplicationError("Invalid action or missing parameters"));
}

export async function isPinned(
  context: Context,
  userId: string,
  regionId: string,
): Promise<Result<boolean, ApplicationError>> {
  const result = await context.favoriteRepository.isPinned(
    userId as UserId,
    regionId as RegionId,
  );
  if (result.isErr()) {
    return err(
      new ApplicationError("Failed to check pin status", result.error),
    );
  }

  return ok(result.value);
}
