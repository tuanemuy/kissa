import type { UserId } from "@/core/domain/user/types";
import { auth } from "@/lib/authjs";

export async function getAuthenticatedUserId(): Promise<UserId | null> {
  const session = await auth();
  return session?.user?.id ? (session.user.id as UserId) : null;
}

export async function getCurrentUser(): Promise<UserId | null> {
  return getAuthenticatedUserId();
}

export async function requireAuth(): Promise<UserId> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    throw new Error("Authentication required");
  }
  return userId;
}
