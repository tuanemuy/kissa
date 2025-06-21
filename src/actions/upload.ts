"use server";

import { getContext } from "./context";

export async function uploadImagesAction(formData: FormData) {
  const context = await getContext();

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
