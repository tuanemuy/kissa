import type { FileUpload } from "@/core/domain/fileUpload/types";
import { entityTypeSchema } from "@/core/domain/fileUpload/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { type Result, err } from "neverthrow";
import { z } from "zod/v4";
import type { Context } from "../context";

export const getEntityImagesInputSchema = z.object({
  entityType: entityTypeSchema,
  entityId: z.string(),
});
export type GetEntityImagesInput = z.infer<typeof getEntityImagesInputSchema>;

export async function getEntityImages(
  context: Context,
  input: GetEntityImagesInput,
): Promise<Result<FileUpload[], ApplicationError>> {
  const parseResult = validate(getEntityImagesInputSchema, input);

  if (parseResult.isErr()) {
    return err(new ApplicationError("Invalid input", parseResult.error));
  }

  const { entityType, entityId } = parseResult.value;

  const result = await context.fileUploadRepository.findByEntityId(
    entityType,
    entityId,
  );
  return result.mapErr(
    (error) => new ApplicationError("Failed to get entity images", error),
  );
}
