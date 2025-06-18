"use server";

import { acceptLocationInvitation as acceptLocationInvitationService } from "@/core/application/location/acceptLocationInvitation";
import { acceptLocationInvitationInputSchema } from "@/core/application/location/acceptLocationInvitation";
import { createLocation as createLocationService } from "@/core/application/location/createLocation";
import { createLocationInputSchema } from "@/core/application/location/createLocation";
import { deleteLocation as deleteLocationService } from "@/core/application/location/deleteLocation";
import { getLocation as getLocationService } from "@/core/application/location/getLocation";
import { inviteLocationEditor as inviteLocationEditorService } from "@/core/application/location/inviteLocationEditor";
import { inviteLocationEditorInputSchema } from "@/core/application/location/inviteLocationEditor";
import { listLocationEditors as listLocationEditorsService } from "@/core/application/location/listLocationEditors";
import { listLocationEditorsInputSchema } from "@/core/application/location/listLocationEditors";
import { listLocations as listLocationsService } from "@/core/application/location/listLocations";
import { removeLocationEditor as removeLocationEditorService } from "@/core/application/location/removeLocationEditor";
import { removeLocationEditorInputSchema } from "@/core/application/location/removeLocationEditor";
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

export async function getLocationAction(locationId: string) {
  const context = getContext();

  const userIdResult = await context.authService.requireAuthUserId();
  if (userIdResult.isErr()) {
    throw new Error(userIdResult.error.message);
  }

  const validatedLocationId = locationIdSchema.safeParse(locationId);
  if (!validatedLocationId.success) {
    throw new Error("Invalid location ID");
  }

  const result = await getLocationService(
    context,
    validatedLocationId.data,
    userIdResult.value,
    { includeStats: true },
  );

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  if (!result.value) {
    throw new Error("Location not found");
  }

  return result.value;
}

export async function listLocationsAction(
  regionId: string,
  page = 1,
  limit = 10,
) {
  const context = getContext();

  const userIdResult = await context.authService.requireAuthUserId();
  if (userIdResult.isErr()) {
    throw new Error(userIdResult.error.message);
  }

  const validatedRegionId = regionIdSchema.safeParse(regionId);
  if (!validatedRegionId.success) {
    throw new Error("Invalid region ID");
  }

  const result = await listLocationsService(
    context,
    {
      filter: { regionId: validatedRegionId.data },
      pagination: { page, limit },
      includeStats: true,
    },
    userIdResult.value,
  );

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  return result.value;
}

// Editor invitation actions

export async function inviteLocationEditorAction(formData: FormData) {
  const context = getContext();

  const userIdResult = await context.authService.requireAuthUserId();
  if (userIdResult.isErr()) {
    throw new Error(userIdResult.error.message);
  }

  // Parse and validate FormData with schema
  const formResult = parseFormData(formData, inviteLocationEditorInputSchema);
  if (formResult.isErr()) {
    throw new Error(`Invalid input: ${formResult.error.message}`);
  }

  const result = await inviteLocationEditorService(
    context,
    userIdResult.value,
    formResult.value,
  );

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  revalidatePath(`/locations/${formResult.value.locationId}/editors`);
  return result.value;
}

export async function acceptLocationInvitationAction(formData: FormData) {
  const context = getContext();

  const userIdResult = await context.authService.requireAuthUserId();
  if (userIdResult.isErr()) {
    throw new Error(userIdResult.error.message);
  }

  // Parse and validate FormData with schema
  const formResult = parseFormData(
    formData,
    acceptLocationInvitationInputSchema,
  );
  if (formResult.isErr()) {
    throw new Error(`Invalid input: ${formResult.error.message}`);
  }

  const result = await acceptLocationInvitationService(
    context,
    userIdResult.value,
    formResult.value,
  );

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  revalidatePath("/profile/invitations");
  return result.value;
}

export async function removeLocationEditorAction(formData: FormData) {
  const context = getContext();

  const userIdResult = await context.authService.requireAuthUserId();
  if (userIdResult.isErr()) {
    throw new Error(userIdResult.error.message);
  }

  // Parse and validate FormData with schema
  const formResult = parseFormData(formData, removeLocationEditorInputSchema);
  if (formResult.isErr()) {
    throw new Error(`Invalid input: ${formResult.error.message}`);
  }

  const result = await removeLocationEditorService(
    context,
    userIdResult.value,
    formResult.value,
  );

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  revalidatePath(`/locations/${formResult.value.locationId}/editors`);
  return result.value;
}

export async function listLocationEditorsAction(locationId: string) {
  const context = getContext();

  const userIdResult = await context.authService.requireAuthUserId();
  if (userIdResult.isErr()) {
    throw new Error(userIdResult.error.message);
  }

  const validatedLocationId = locationIdSchema.safeParse(locationId);
  if (!validatedLocationId.success) {
    throw new Error("Invalid location ID");
  }

  const result = await listLocationEditorsService(context, userIdResult.value, {
    locationId: validatedLocationId.data,
  });

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  return result.value;
}
