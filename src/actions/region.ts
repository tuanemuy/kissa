"use server";

import { createRegion as createRegionService } from "@/core/application/region/createRegion";
import { createRegionInputSchema } from "@/core/application/region/createRegion";
import { userIdSchema } from "@/core/domain/user/types";
import { auth } from "@/lib/auth";
import { parseFormData } from "@/lib/formData";
import { validate } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getContext } from "./context";

export async function createRegionAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const userIdResult = validate(userIdSchema, session.user.id);
  if (userIdResult.isErr()) {
    throw new Error("Invalid user ID");
  }

  // Parse and validate FormData with schema
  const inputResult = parseFormData(formData, createRegionInputSchema);
  if (inputResult.isErr()) {
    throw new Error(`Invalid input: ${inputResult.error.message}`);
  }

  const context = getContext();
  const result = await createRegionService(
    context,
    userIdResult.value,
    inputResult.value,
  );

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  revalidatePath("/dashboard");
  redirect(`/regions/${result.value.id}`);
}
