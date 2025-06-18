"use server";

import { createLocation as createLocationService } from "@/core/application/location/createLocation";
import { createLocationInputSchema } from "@/core/application/location/createLocation";
import { deleteLocation as deleteLocationService } from "@/core/application/location/deleteLocation";
import { updateLocation as updateLocationService } from "@/core/application/location/updateLocation";
import { updateLocationInputSchema } from "@/core/application/location/updateLocation";
import { locationIdSchema, regionIdSchema } from "@/core/domain/location/types";
import { parseFormData } from "@/lib/formData";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod/v4";
import { getContext } from "./context";

// Schema for location form data that includes regionId
const createLocationFormSchema = createLocationInputSchema.extend({
  regionId: regionIdSchema,
});

export async function createLocationAction(formData: FormData) {
  const context = getContext();
  
  const userIdResult = await context.authService.requireAuthUserId();
  if (userIdResult.isErr()) {
    throw new Error(userIdResult.error.message);
  }

  // Parse and validate FormData with schema
  const formResult = parseFormData(formData, createLocationFormSchema);
  if (formResult.isErr()) {
    throw new Error(`Invalid input: ${formResult.error.message}`);
  }

  const { regionId, ...locationInput } = formResult.value;

  const result = await createLocationService(
    context,
    userIdResult.value,
    regionId,
    locationInput,
  );

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  revalidatePath(`/regions/${regionId}`);
  redirect(`/locations/${result.value.id}`);
}

// Schema for update location form data that includes locationId
const updateLocationFormSchema = updateLocationInputSchema.extend({
  locationId: locationIdSchema,
});

export async function updateLocationAction(formData: FormData) {
  const context = getContext();
  
  const userIdResult = await context.authService.requireAuthUserId();
  if (userIdResult.isErr()) {
    throw new Error(userIdResult.error.message);
  }

  // Parse and validate FormData with schema
  const formResult = parseFormData(formData, updateLocationFormSchema);
  if (formResult.isErr()) {
    throw new Error(`Invalid input: ${formResult.error.message}`);
  }

  const { locationId, ...locationInput } = formResult.value;

  const result = await updateLocationService(
    context,
    userIdResult.value,
    locationId,
    locationInput,
  );

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  revalidatePath(`/locations/${locationId}`);
  redirect(`/locations/${locationId}`);
}

// Schema for delete location form data
const deleteLocationFormSchema = z.object({
  locationId: locationIdSchema,
  regionId: regionIdSchema,
});

export async function deleteLocationAction(formData: FormData) {
  const context = getContext();
  
  const userIdResult = await context.authService.requireAuthUserId();
  if (userIdResult.isErr()) {
    throw new Error(userIdResult.error.message);
  }

  // Parse and validate FormData with schema
  const formResult = parseFormData(formData, deleteLocationFormSchema);
  if (formResult.isErr()) {
    throw new Error(`Invalid input: ${formResult.error.message}`);
  }

  const { locationId, regionId } = formResult.value;

  const result = await deleteLocationService(
    context,
    userIdResult.value,
    locationId,
  );

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  revalidatePath(`/regions/${regionId}`);
  redirect(`/regions/${regionId}`);
}
