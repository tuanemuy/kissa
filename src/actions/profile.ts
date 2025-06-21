"use server";

import { listCheckInsWithUserAction } from "@/actions/checkIn";
import { getSessionUser } from "@/actions/user";
import type { CheckInWithUser } from "@/core/domain/checkIn/types";

export async function getUserCheckInHistoryAction(page = 1, limit = 10) {
  const user = await getSessionUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const result = await listCheckInsWithUserAction({
    filter: { userId: user.id },
    pagination: { page, limit },
  });

  return result;
}
