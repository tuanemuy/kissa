"use server";

import { createRegion } from "@/core/application/region/createRegion";
import { deleteRegion } from "@/core/application/region/deleteRegion";
import { updateRegion } from "@/core/application/region/updateRegion";
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

  const input = {
    id: getFormDataString(formData, "id"),
    userId,
    name: getFormDataString(formData, "name"),
    description: getFormDataString(formData, "description"),
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
