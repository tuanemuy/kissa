import { type Result, err, ok } from "neverthrow";
import { z } from "zod/v4";

import type {
  Region,
  RegionId,
  RegionWithStats,
} from "@/core/domain/region/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";

import type { Context } from "../context";

export const getRegionInputSchema = z.object({
  id: z.string().uuid(),
});
export type GetRegionInput = z.infer<typeof getRegionInputSchema>;

export async function getRegion(
  context: Context,
  input: GetRegionInput,
): Promise<Result<Region | null, ApplicationError>> {
  const parseResult = validate(getRegionInputSchema, input);
  if (parseResult.isErr()) {
    return err(new ApplicationError("Invalid input", parseResult.error));
  }

  const result = await context.regionRepository.findById(input.id as RegionId);
  if (result.isErr()) {
    return err(new ApplicationError("Failed to get region", result.error));
  }

  return ok(result.value);
}

export async function getRegionWithStats(
  context: Context,
  input: GetRegionInput,
): Promise<Result<RegionWithStats | null, ApplicationError>> {
  const parseResult = validate(getRegionInputSchema, input);
  if (parseResult.isErr()) {
    return err(new ApplicationError("Invalid input", parseResult.error));
  }

  const result = await context.regionRepository.findByIdWithStats(
    input.id as RegionId,
  );
  if (result.isErr()) {
    return err(
      new ApplicationError("Failed to get region with stats", result.error),
    );
  }

  return ok(result.value);
}
