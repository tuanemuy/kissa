import { type UserId, userIdSchema } from "@/core/domain/user/types";
import { validate } from "@/lib/validation";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "kissa_session";

export interface SessionData {
  userId: UserId;
  expiresAt: Date;
}

export async function getCurrentUserId(): Promise<UserId | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie) {
    return null;
  }

  try {
    const sessionData = JSON.parse(sessionCookie.value) as SessionData;

    // Check if session is expired
    if (new Date() > new Date(sessionData.expiresAt)) {
      await clearSession();
      return null;
    }

    // Validate userId format
    const userIdResult = validate(userIdSchema, sessionData.userId);
    if (userIdResult.isErr()) {
      return null;
    }

    return userIdResult.value;
  } catch {
    return null;
  }
}

export async function setSession(userId: UserId): Promise<void> {
  const cookieStore = await cookies();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const sessionData: SessionData = {
    userId,
    expiresAt,
  };

  cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 24 * 60 * 60, // 24 hours
    path: "/",
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function requireAuth(): Promise<UserId> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("Authentication required");
  }
  return userId;
}

// Legacy placeholder for backward compatibility
export async function auth() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return null;
  }

  return {
    user: {
      id: userId,
      email: "test@example.com", // TODO: Get from user repository
      name: "Test User", // TODO: Get from user repository
    },
  };
}
