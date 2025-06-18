import { type Result, err, ok } from "neverthrow";
import { z } from "zod/v4";

import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
const simplePaginationSchema = z.object({
  page: z.number().positive(),
  limit: z.number().positive().max(100),
});
import type {
  AddFavoriteParams,
  Favorite,
  FavoriteWithLocation,
  FavoriteWithRegion,
  ListFavoritesQuery,
  RemoveFavoriteParams,
} from "@/core/domain/favorite/types";
import type { LocationId } from "@/core/domain/location/types";
import type { RegionId } from "@/core/domain/region/types";
import type { UserId } from "@/core/domain/user/types";

import type { Context } from "../context";

export const addFavoriteInputSchema = z
  .object({
    userId: z.string().uuid(),
    regionId: z.string().uuid().optional(),
    locationId: z.string().uuid().optional(),
  })
  .refine(
    (data) =>
      (data.regionId && !data.locationId) ||
      (!data.regionId && data.locationId),
    { message: "Either regionId or locationId must be provided, but not both" },
  );
export type AddFavoriteInput = z.infer<typeof addFavoriteInputSchema>;

export const removeFavoriteInputSchema = z
  .object({
    userId: z.string().uuid(),
    regionId: z.string().uuid().optional(),
    locationId: z.string().uuid().optional(),
  })
  .refine(
    (data) =>
      (data.regionId && !data.locationId) ||
      (!data.regionId && data.locationId),
    { message: "Either regionId or locationId must be provided, but not both" },
  );
export type RemoveFavoriteInput = z.infer<typeof removeFavoriteInputSchema>;

export const listFavoritesInputSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(["region", "location", "all"]).optional().default("all"),
  pagination: simplePaginationSchema,
});
export type ListFavoritesInput = z.infer<typeof listFavoritesInputSchema>;

export async function addFavorite(
  context: Context,
  input: AddFavoriteInput,
): Promise<Result<Favorite, ApplicationError>> {
  const parseResult = validate(addFavoriteInputSchema, input);
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

  // Verify target exists
  if (params.regionId) {
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
      return err(new ApplicationError("Cannot favorite private region"));
    }
  }

  if (params.locationId) {
    const locationResult = await context.locationRepository.findById(
      params.locationId as LocationId,
    );
    if (locationResult.isErr()) {
      return err(
        new ApplicationError("Failed to verify location", locationResult.error),
      );
    }

    if (!locationResult.value) {
      return err(new ApplicationError("Location not found"));
    }

    if (!locationResult.value.isPublic) {
      return err(new ApplicationError("Cannot favorite private location"));
    }
  }

  // Add favorite
  const addParams: AddFavoriteParams = {
    userId: params.userId as UserId,
    regionId: params.regionId as RegionId | undefined,
    locationId: params.locationId as LocationId | undefined,
  };

  const result = await context.favoriteRepository.addFavorite(addParams);
  if (result.isErr()) {
    return err(new ApplicationError("Failed to add favorite", result.error));
  }

  return ok(result.value);
}

export async function removeFavorite(
  context: Context,
  input: RemoveFavoriteInput,
): Promise<Result<void, ApplicationError>> {
  const parseResult = validate(removeFavoriteInputSchema, input);
  if (parseResult.isErr()) {
    return err(new ApplicationError("Invalid input", parseResult.error));
  }

  const params = parseResult.value;

  // Remove favorite
  const removeParams: RemoveFavoriteParams = {
    userId: params.userId as UserId,
    regionId: params.regionId as RegionId | undefined,
    locationId: params.locationId as LocationId | undefined,
  };

  const result = await context.favoriteRepository.removeFavorite(removeParams);
  if (result.isErr()) {
    return err(new ApplicationError("Failed to remove favorite", result.error));
  }

  return ok(undefined);
}

export async function listFavorites(
  context: Context,
  input: ListFavoritesInput,
): Promise<Result<{ items: Favorite[]; count: number }, ApplicationError>> {
  const parseResult = validate(listFavoritesInputSchema, input);
  if (parseResult.isErr()) {
    return err(new ApplicationError("Invalid input", parseResult.error));
  }

  const query: ListFavoritesQuery = {
    userId: parseResult.value.userId as UserId,
    type: parseResult.value.type,
    pagination: parseResult.value.pagination,
  };

  const result = await context.favoriteRepository.listFavorites(query);
  if (result.isErr()) {
    return err(new ApplicationError("Failed to list favorites", result.error));
  }

  return ok(result.value);
}

export async function listFavoritesWithRegion(
  context: Context,
  input: ListFavoritesInput,
): Promise<
  Result<{ items: FavoriteWithRegion[]; count: number }, ApplicationError>
> {
  const parseResult = validate(listFavoritesInputSchema, input);
  if (parseResult.isErr()) {
    return err(new ApplicationError("Invalid input", parseResult.error));
  }

  const query: ListFavoritesQuery = {
    userId: parseResult.value.userId as UserId,
    type: "region",
    pagination: parseResult.value.pagination,
  };

  const result =
    await context.favoriteRepository.listFavoritesWithRegion(query);
  if (result.isErr()) {
    return err(
      new ApplicationError(
        "Failed to list favorites with region",
        result.error,
      ),
    );
  }

  return ok(result.value);
}

export async function listFavoritesWithLocation(
  context: Context,
  input: ListFavoritesInput,
): Promise<
  Result<{ items: FavoriteWithLocation[]; count: number }, ApplicationError>
> {
  const parseResult = validate(listFavoritesInputSchema, input);
  if (parseResult.isErr()) {
    return err(new ApplicationError("Invalid input", parseResult.error));
  }

  const query: ListFavoritesQuery = {
    userId: parseResult.value.userId as UserId,
    type: "location",
    pagination: parseResult.value.pagination,
  };

  const result =
    await context.favoriteRepository.listFavoritesWithLocation(query);
  if (result.isErr()) {
    return err(
      new ApplicationError(
        "Failed to list favorites with location",
        result.error,
      ),
    );
  }

  return ok(result.value);
}

/**
 * Manages favorites (add/remove)
 */
export async function manageFavorites(
  context: Context,
  input: {
    action: "add" | "remove";
    targetId: string;
    targetType: "region" | "location";
    userId?: string;
  },
): Promise<Result<undefined | Favorite, ApplicationError>> {
  // TODO: Get userId from session/auth context
  const userId = input.userId || "00000000-0000-0000-0000-000000000000";

  if (input.action === "add") {
    const addInput: AddFavoriteInput = {
      userId,
      regionId: input.targetType === "region" ? input.targetId : undefined,
      locationId: input.targetType === "location" ? input.targetId : undefined,
    };
    return addFavorite(context, addInput);
  }
  const removeInput: RemoveFavoriteInput = {
    userId,
    regionId: input.targetType === "region" ? input.targetId : undefined,
    locationId: input.targetType === "location" ? input.targetId : undefined,
  };
  return removeFavorite(context, removeInput).then((result) =>
    result.map(() => undefined),
  );
}

export async function isFavorited(
  context: Context,
  userId: string,
  regionId?: string,
  locationId?: string,
): Promise<Result<boolean, ApplicationError>> {
  if (!regionId && !locationId) {
    return err(
      new ApplicationError("Either regionId or locationId must be provided"),
    );
  }

  if (regionId && locationId) {
    return err(
      new ApplicationError("Cannot check both regionId and locationId"),
    );
  }

  const result = await context.favoriteRepository.isFavorited(
    userId as UserId,
    regionId as RegionId | undefined,
    locationId as LocationId | undefined,
  );

  if (result.isErr()) {
    return err(
      new ApplicationError("Failed to check favorite status", result.error),
    );
  }

  return ok(result.value);
}
