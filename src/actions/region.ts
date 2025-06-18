"use server";

import { createRegion } from "@/core/application/region/createRegion";
import { deleteRegion } from "@/core/application/region/deleteRegion";
import { getRegion } from "@/core/application/region/getRegion";
import { listRegions } from "@/core/application/region/listRegions";
import { updateRegion } from "@/core/application/region/updateRegion";
import type { RegionId } from "@/core/domain/region/types";
import { getFormDataString } from "@/lib/formData";
import { validateFormData } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod/v4";
import { getContext } from "./context";

const createRegionSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  isPublic: z.boolean(),
});

const updateRegionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  isPublic: z.boolean().optional(),
  coverPhotoUrl: z.string().url().nullable().optional(),
});

const deleteRegionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
});

export async function createRegionAction(formData: FormData) {
  const context = getContext();

  const input = {
    name: getFormDataString(formData, "name"),
    description: getFormDataString(formData, "description"),
    latitude: Number(getFormDataString(formData, "latitude")),
    longitude: Number(getFormDataString(formData, "longitude")),
    isPublic: getFormDataString(formData, "isPublic") === "true",
  };

  const validationResult = validateFormData(createRegionSchema, input);
  if (validationResult.isErr()) {
    throw new Error(validationResult.error.message);
  }

  const params = validationResult.value;

  const userIdResult = await context.authService.requireAuthUserId();
  if (userIdResult.isErr()) {
    throw new Error(userIdResult.error.message);
  }

  const result = await createRegion(context, userIdResult.value, params);

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  revalidatePath("/dashboard");
  redirect(`/regions/${result.value.id}`);
}

export async function updateRegionAction(formData: FormData) {
  const context = getContext();

  const userIdResult = await context.authService.requireAuthUserId();
  if (userIdResult.isErr()) {
    throw new Error(userIdResult.error.message);
  }
  const userId = userIdResult.value;

  const latitudeStr = getFormDataString(formData, "latitude");
  const longitudeStr = getFormDataString(formData, "longitude");

  const input = {
    id: getFormDataString(formData, "id"),
    userId,
    name: getFormDataString(formData, "name"),
    description: getFormDataString(formData, "description"),
    latitude: latitudeStr ? Number(latitudeStr) : null,
    longitude: longitudeStr ? Number(longitudeStr) : null,
    isPublic: getFormDataString(formData, "isPublic") === "true",
  };

  const validationResult = validateFormData(updateRegionSchema, input);
  if (validationResult.isErr()) {
    throw new Error(validationResult.error.message);
  }

  const params = validationResult.value;

  const result = await updateRegion(context, params);

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  revalidatePath(`/regions/${params.id}`);
  revalidatePath("/dashboard");
  redirect(`/regions/${params.id}`);
}

export async function deleteRegionAction(formData: FormData) {
  const context = getContext();

  const userIdResult = await context.authService.requireAuthUserId();
  if (userIdResult.isErr()) {
    throw new Error(userIdResult.error.message);
  }
  const userId = userIdResult.value;

  const input = {
    id: getFormDataString(formData, "id"),
    userId,
  };

  const validationResult = validateFormData(deleteRegionSchema, input);
  if (validationResult.isErr()) {
    throw new Error(validationResult.error.message);
  }

  const params = validationResult.value;

  const result = await deleteRegion(context, params);

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function listRegionsAction() {
  const context = getContext();

  const userIdResult = await context.authService.requireAuthUserId();
  if (userIdResult.isErr()) {
    throw new Error(userIdResult.error.message);
  }
  const userId = userIdResult.value;

  const result = await listRegions(context, {
    pagination: { page: 1, limit: 20 },
    filter: { creatorId: userId },
    sort: { field: "updatedAt", order: "desc" },
  });

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  return result.value;
}

export async function getRegionAction(regionId: string) {
  const context = getContext();

  const result = await getRegion(context, { id: regionId });

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  return result.value;
}

export async function getRegionWithStatusAction(regionId: string) {
  const context = getContext();

  // Get the region data
  const regionResult = await getRegion(context, { id: regionId });
  if (regionResult.isErr()) {
    throw new Error(regionResult.error.message);
  }

  const region = regionResult.value;
  if (!region) {
    return null;
  }

  // Check if user is authenticated and get favorite/pin status
  const userIdResult = await context.authService.getCurrentUserId();
  if (userIdResult.isErr() || !userIdResult.value) {
    // User not authenticated, return region without status
    return {
      ...region,
      isFavorited: false,
      isPinned: false,
    };
  }

  const userId = userIdResult.value;

  // Get favorite and pin status in parallel
  const [favoriteResult, pinResult] = await Promise.all([
    context.favoriteRepository.isFavorited(userId, regionId as RegionId),
    context.favoriteRepository.isPinned(userId, regionId as RegionId),
  ]);

  return {
    ...region,
    isFavorited: favoriteResult.isOk() ? favoriteResult.value : false,
    isPinned: pinResult.isOk() ? pinResult.value : false,
  };
}
