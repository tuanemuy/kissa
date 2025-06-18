"use server";

import { authenticateUser as authenticateUserService } from "@/core/application/user/authenticateUser";
import { authenticateUserInputSchema } from "@/core/application/user/authenticateUser";
import { createUser as createUserService } from "@/core/application/user/createUser";
import { createUserInputSchema } from "@/core/application/user/createUser";
import { clearSession, setSession } from "@/lib/auth";
import { parseFormData } from "@/lib/formData";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getContext } from "./context";

export async function registerUserAction(formData: FormData) {
  // Parse and validate FormData with schema
  const formResult = parseFormData(formData, createUserInputSchema);
  if (formResult.isErr()) {
    throw new Error(`Invalid input: ${formResult.error.message}`);
  }

  const context = getContext();
  const result = await createUserService(context, formResult.value);

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  revalidatePath("/auth/login");
  redirect("/auth/login");
}

export async function loginUserAction(formData: FormData) {
  // Parse and validate FormData with schema
  const formResult = parseFormData(formData, authenticateUserInputSchema);
  if (formResult.isErr()) {
    throw new Error(`Invalid input: ${formResult.error.message}`);
  }

  const context = getContext();
  const result = await authenticateUserService(context, formResult.value);

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  // Set session cookie
  await setSession(result.value.user.id);

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function logoutUserAction() {
  await clearSession();
  revalidatePath("/");
  redirect("/");
}
