"use server";

import { createCheckIn } from "@/core/application/checkIn/createCheckIn";
import { deleteCheckIn } from "@/core/application/checkIn/deleteCheckIn";
import { updateCheckIn } from "@/core/application/checkIn/updateCheckIn";
import type { CheckInId } from "@/core/domain/checkIn/types";
import { getFormDataFile, getFormDataString } from "@/lib/formData";
import { validateFormData } from "@/lib/validation";
import { redirect } from "next/navigation";
import { z } from "zod/v4";
import { getContext } from "./context";

const createCheckInSchema = z.object({
  userId: z.string().uuid(),
  locationId: z.string().uuid(),
  photoUrl: z.string().url().optional(),
  comment: z.string().max(500).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  isPublic: z.boolean().optional().default(true),
});

const updateCheckInSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  photoUrl: z.string().url().nullable().optional(),
  comment: z.string().max(500).nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  isPublic: z.boolean().optional(),
});

const deleteCheckInSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
});

export async function createCheckInAction(formData: FormData) {
  const context = getContext();

  // TODO: Get userId from session/auth context
  const userId = "00000000-0000-0000-0000-000000000000";

  const input = {
    userId,
    locationId: getFormDataString(formData, "locationId"),
    comment: getFormDataString(formData, "comment"),
    photoUrl: undefined, // TODO: Handle file upload
    isPublic: true,
  };

  const validationResult = validateFormData(createCheckInSchema, input);
  if (validationResult.isErr()) {
    throw new Error(validationResult.error.message);
  }

  const params = validationResult.value;

  const result = await createCheckIn(context, params);

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  redirect(`/locations/${params.locationId}`);
}

export async function updateCheckInAction(formData: FormData) {
  const context = getContext();

  // TODO: Get userId from session/auth context
  const userId = "00000000-0000-0000-0000-000000000000";

  const input = {
    id: getFormDataString(formData, "id"),
    userId,
    comment: getFormDataString(formData, "comment"),
    photoUrl: undefined, // TODO: Handle file upload
  };

  const validationResult = validateFormData(updateCheckInSchema, input);
  if (validationResult.isErr()) {
    throw new Error(validationResult.error.message);
  }

  const params = validationResult.value;

  const result = await updateCheckIn(context, params);

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  // Redirect back to the location page
  const checkInResult = await context.checkInRepository.findById(
    params.id as CheckInId,
  );
  if (checkInResult.isOk() && checkInResult.value) {
    redirect(`/locations/${checkInResult.value.locationId}`);
  } else {
    redirect("/dashboard");
  }
}

export async function deleteCheckInAction(formData: FormData) {
  const context = getContext();

  // TODO: Get userId from session/auth context
  const userId = "00000000-0000-0000-0000-000000000000";

  const input = {
    id: getFormDataString(formData, "id"),
    userId,
  };

  const validationResult = validateFormData(deleteCheckInSchema, input);
  if (validationResult.isErr()) {
    throw new Error(validationResult.error.message);
  }

  const params = validationResult.value;

  // Get the check-in to know which location to redirect to
  const checkInResult = await context.checkInRepository.findById(
    params.id as CheckInId,
  );
  const locationId =
    checkInResult.isOk() && checkInResult.value
      ? checkInResult.value.locationId
      : null;

  const result = await deleteCheckIn(context, params);

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  if (locationId) {
    redirect(`/locations/${locationId}`);
  } else {
    redirect("/dashboard");
  }
}
