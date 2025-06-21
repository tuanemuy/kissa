"use server";

import { getEntityImages } from "@/core/application/fileUpload/getEntityImages";
import { getContext } from "./context";

export async function getLocationImagesAction(locationId: string) {
  const context = getContext();

  const result = await getEntityImages(context, {
    entityType: "location_image",
    entityId: locationId,
  });

  if (result.isErr()) {
    throw new Error(`Failed to get location images: ${result.error.message}`);
  }

  return result.value.map((upload) => upload.fileUrl);
}
