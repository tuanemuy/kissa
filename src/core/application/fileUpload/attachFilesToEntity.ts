import type { FileUpload } from "@/core/domain/fileUpload/types";
import { attachFilesToEntityParamsSchema } from "@/core/domain/fileUpload/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { type Result, err } from "neverthrow";
import type { z } from "zod/v4";
import type { Context } from "../context";

export const attachFilesToEntityInputSchema = attachFilesToEntityParamsSchema;
export type AttachFilesToEntityInput = z.infer<
  typeof attachFilesToEntityInputSchema
>;

export async function attachFilesToEntity(
  context: Context,
  input: AttachFilesToEntityInput,
): Promise<Result<FileUpload[], ApplicationError>> {
  const parseResult = validate(attachFilesToEntityInputSchema, input);

  if (parseResult.isErr()) {
    return err(new ApplicationError("Invalid input", parseResult.error));
  }

  const params = parseResult.value;

  const result = await context.fileUploadRepository.attachFilesToEntity(params);
  return result.mapErr(
    (error) => new ApplicationError("Failed to attach files to entity", error),
  );
}
