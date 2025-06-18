"use server";

import { manageFavorites } from "@/core/application/favorite/manageFavorites";
import { managePinnedRegions } from "@/core/application/favorite/managePinnedRegions";
import { getFormDataString } from "@/lib/formData";
import { validateFormData } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { getContext } from "./context";

const addFavoriteSchema = z.object({
  targetId: z.string().uuid(),
  targetType: z.enum(["region", "location"]),
});

const removeFavoriteSchema = z.object({
  targetId: z.string().uuid(),
  targetType: z.enum(["region", "location"]),
});

const pinRegionSchema = z.object({
  regionId: z.string().uuid(),
});

const unpinRegionSchema = z.object({
  regionId: z.string().uuid(),
});

const reorderPinnedRegionsSchema = z.object({
  regionIds: z.array(z.string().uuid()),
});

export async function addFavoriteAction(formData: FormData) {
  const context = getContext();

  const input = {
    targetId: getFormDataString(formData, "targetId"),
    targetType: getFormDataString(formData, "targetType") as
      | "region"
      | "location",
  };

  const validationResult = validateFormData(addFavoriteSchema, input);
  if (validationResult.isErr()) {
    throw new Error(validationResult.error.message);
  }

  const params = validationResult.value;

  const result = await manageFavorites(context, {
    action: "add",
    targetId: params.targetId,
    targetType: params.targetType,
  });

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  // Revalidate the relevant pages
  if (params.targetType === "region") {
    revalidatePath(`/regions/${params.targetId}`);
    revalidatePath("/dashboard");
  } else {
    revalidatePath(`/locations/${params.targetId}`);
    revalidatePath("/dashboard");
  }
}

export async function removeFavoriteAction(formData: FormData) {
  const context = getContext();

  const input = {
    targetId: getFormDataString(formData, "targetId"),
    targetType: getFormDataString(formData, "targetType") as
      | "region"
      | "location",
  };

  const validationResult = validateFormData(removeFavoriteSchema, input);
  if (validationResult.isErr()) {
    throw new Error(validationResult.error.message);
  }

  const params = validationResult.value;

  const result = await manageFavorites(context, {
    action: "remove",
    targetId: params.targetId,
    targetType: params.targetType,
  });

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  // Revalidate the relevant pages
  if (params.targetType === "region") {
    revalidatePath(`/regions/${params.targetId}`);
    revalidatePath("/dashboard");
  } else {
    revalidatePath(`/locations/${params.targetId}`);
    revalidatePath("/dashboard");
  }
}

export async function pinRegionAction(formData: FormData) {
  const context = getContext();

  const input = {
    regionId: getFormDataString(formData, "regionId"),
  };

  const validationResult = validateFormData(pinRegionSchema, input);
  if (validationResult.isErr()) {
    throw new Error(validationResult.error.message);
  }

  const params = validationResult.value;

  const result = await managePinnedRegions(context, {
    action: "pin",
    regionId: params.regionId,
  });

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  revalidatePath(`/regions/${params.regionId}`);
  revalidatePath("/dashboard");
}

export async function unpinRegionAction(formData: FormData) {
  const context = getContext();

  const input = {
    regionId: getFormDataString(formData, "regionId"),
  };

  const validationResult = validateFormData(unpinRegionSchema, input);
  if (validationResult.isErr()) {
    throw new Error(validationResult.error.message);
  }

  const params = validationResult.value;

  const result = await managePinnedRegions(context, {
    action: "unpin",
    regionId: params.regionId,
  });

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  revalidatePath(`/regions/${params.regionId}`);
  revalidatePath("/dashboard");
}

export async function reorderPinnedRegionsAction(formData: FormData) {
  const context = getContext();

  const regionIdsString = getFormDataString(formData, "regionIds");
  const regionIds = regionIdsString ? JSON.parse(regionIdsString) : [];

  const input = {
    regionIds,
  };

  const validationResult = validateFormData(reorderPinnedRegionsSchema, input);
  if (validationResult.isErr()) {
    throw new Error(validationResult.error.message);
  }

  const params = validationResult.value;

  const result = await managePinnedRegions(context, {
    action: "reorder",
    regionIds: params.regionIds,
  });

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  revalidatePath("/dashboard");
}
