"use server";

import { createUser as createUserService } from "@/core/application/user/createUser";
import { createUserInputSchema } from "@/core/application/user/createUser";
import type {
  SubscriptionPlan,
  UserId,
  UserRole,
} from "@/core/domain/user/types";
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
  // Parse and validate FormData
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  const context = getContext();
  const result = await context.authService.signIn(email, password);

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function logoutUserAction() {
  const context = getContext();
  const result = await context.authService.signOut();

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  revalidatePath("/");
  redirect("/");
}

export async function getSessionUser() {
  const context = getContext();
  const result = await context.authService.getCurrentUser();

  if (result.isErr()) {
    return null;
  }

  return result.value;
}

// Admin user management actions

export async function getUsers(query: {
  page?: number;
  limit?: number;
  role?: string;
  subscription?: string;
  isActive?: boolean;
  search?: string;
  sortField?: string;
  sortOrder?: string;
}) {
  const context = getContext();

  // Build query object
  const listQuery = {
    pagination: {
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    },
    filter: {
      ...(query.role && { role: query.role as UserRole }),
      ...(query.subscription && {
        subscription: query.subscription as SubscriptionPlan,
      }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && { search: query.search }),
    },
    ...(query.sortField && {
      sort: {
        field: query.sortField as "createdAt" | "updatedAt" | "name" | "email",
        order: (query.sortOrder as "asc" | "desc") ?? "desc",
      },
    }),
  };

  const { listUsers } = await import("@/core/application/user/listUsers");
  const result = await listUsers(context, listQuery);

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  return result.value;
}

export async function getUserDetails(userId: string) {
  const context = getContext();
  const { getUserById } = await import("@/core/application/user/getUserById");

  const result = await getUserById(context, userId as UserId);

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  return result.value;
}

export async function updateUserAction(formData: FormData) {
  const userId = formData.get("userId")?.toString();
  const name = formData.get("name")?.toString();
  const email = formData.get("email")?.toString();
  const role = formData.get("role")?.toString();
  const subscription = formData.get("subscription")?.toString();
  const isActive = formData.get("isActive") === "true";

  if (!userId) {
    throw new Error("User ID is required");
  }

  const context = getContext();
  const { updateUser } = await import("@/core/application/user/updateUser");

  const updateParams = {
    id: userId as UserId,
    ...(name && { name }),
    ...(email && { email }),
    ...(role && { role: role as UserRole }),
    ...(subscription && { subscription: subscription as SubscriptionPlan }),
    isActive,
  };

  const result = await updateUser(context, updateParams);

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  revalidatePath("/admin/users");
}

export async function deleteUserAction(formData: FormData) {
  const userId = formData.get("userId")?.toString();

  if (!userId) {
    throw new Error("User ID is required");
  }

  const context = getContext();
  const { deleteUser } = await import("@/core/application/user/deleteUser");

  const result = await deleteUser(context, userId as UserId);

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  revalidatePath("/admin/users");
}

export async function getSystemStatistics() {
  const context = getContext();
  const { getSystemStatistics: getStats } = await import(
    "@/core/application/admin/getSystemStatistics"
  );

  const result = await getStats(context);

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  return result.value;
}
