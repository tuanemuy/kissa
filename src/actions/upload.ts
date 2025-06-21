"use server";

import { attachFilesToEntity } from "@/core/application/fileUpload/attachFilesToEntity";
import { getContext } from "./context";
import { getSessionUser } from "./user";

export async function uploadImagesAction(formData: FormData) {
  const context = getContext();

  const files = formData.getAll("images") as File[];

  if (files.length === 0) {
    throw new Error("No files provided");
  }

  const uploadResults: string[] = [];

  for (const file of files) {
    if (!file || file.size === 0) continue;

    try {
      const buffer = Buffer.from(await file.arrayBuffer());

      const metadata = {
        name: file.name,
        size: file.size,
        mimeType: file.type,
      };

      const result = await context.fileStorageService.uploadFile(
        buffer,
        metadata,
        {
          folder: "uploads/images",
          contentType: file.type,
        },
      );

      if (result.isErr()) {
        console.error("Upload failed:", result.error);
        throw new Error(
          `Failed to upload ${file.name}: ${result.error.message}`,
        );
      }

      uploadResults.push(result.value.url);
    } catch (error) {
      console.error("Error processing file:", error);
      throw new Error(`Error processing ${file.name}: ${error}`);
    }
  }

  return uploadResults;
}

export async function attachImagesToLocationAction(
  locationId: string,
  imageUrls: string[],
) {
  const context = getContext();

  const user = await getSessionUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  const result = await attachFilesToEntity(context, {
    entityType: "location_image",
    entityId: locationId,
    fileUrls: imageUrls,
    uploadedBy: user.id,
  });

  if (result.isErr()) {
    throw new Error(`Failed to attach images: ${result.error.message}`);
  }

  return result.value;
}
