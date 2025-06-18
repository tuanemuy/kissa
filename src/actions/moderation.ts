"use server";

import { getModerationItem } from "@/core/application/moderation/getModerationItem";
import { getModerationStats } from "@/core/application/moderation/getModerationStats";
import { listModerationItems } from "@/core/application/moderation/listModerationItems";
import { moderateContent } from "@/core/application/moderation/moderateContent";
import { reportContent } from "@/core/application/moderation/reportContent";
import {
  type ModerationItemId,
  contentTypeSchema,
  moderationItemIdSchema,
  moderationStatusSchema,
} from "@/core/domain/moderation/types";
import { type UserId, userIdSchema } from "@/core/domain/user/types";
import { parseFormDataObject } from "@/lib/formData";
import { redirect } from "next/navigation";
import { z } from "zod/v4";
import { getContext } from "./context";

export async function reportContentAction(formData: FormData) {
  const context = await getContext();

  const userIdResult = await context.authService.requireAuthUserId();
  if (userIdResult.isErr()) {
    throw new Error(userIdResult.error.message);
  }
  const reportedBy = userIdResult.value;

  const inputResult = parseFormDataObject(formData, {
    contentType: z.string(),
    contentId: z.string().uuid(),
    reportReason: z.string().max(500).optional(),
  });

  if (inputResult.isErr()) {
    throw new Error(`Invalid form data: ${inputResult.error.message}`);
  }

  const { contentType, ...restData } = inputResult.value;

  // Validate content type
  const contentTypeResult = contentTypeSchema.safeParse(contentType);
  if (!contentTypeResult.success) {
    throw new Error("Invalid content type");
  }

  const { contentId, reportReason } = restData;
  const result = await reportContent(context, {
    contentType: contentTypeResult.data,
    contentId: contentId as string,
    reportedBy,
    reportReason: reportReason as string | undefined,
  });

  if (result.isErr()) {
    throw new Error(`Failed to report content: ${result.error.message}`);
  }

  redirect("/dashboard/moderation");
}

// TODO: This function should check if the authenticated user has moderation permissions
export async function moderateContentAction(formData: FormData) {
  const context = await getContext();

  const userIdResult = await context.authService.requireAuthUserId();
  if (userIdResult.isErr()) {
    throw new Error(userIdResult.error.message);
  }
  const moderatedBy = userIdResult.value;

  const inputResult = parseFormDataObject(formData, {
    id: moderationItemIdSchema,
    status: z.enum(["approved", "rejected"]),
    moderationNote: z.string().max(500).optional(),
  });

  if (inputResult.isErr()) {
    throw new Error(`Invalid form data: ${inputResult.error.message}`);
  }

  const { id, status, moderationNote } = inputResult.value;
  const result = await moderateContent(context, {
    id: id as ModerationItemId,
    status: status as "approved" | "rejected",
    moderatedBy,
    moderationNote: moderationNote as string | undefined,
  });

  if (result.isErr()) {
    throw new Error(`Failed to moderate content: ${result.error.message}`);
  }

  redirect("/dashboard/moderation");
}

// TODO: This function should check if the authenticated user has permission to view moderation items
export async function getModerationItemsList(
  page = 1,
  limit = 20,
  status?: string,
  contentType?: string,
) {
  const context = await getContext();

  const userIdResult = await context.authService.requireAuthUserId();
  if (userIdResult.isErr()) {
    throw new Error(userIdResult.error.message);
  }

  const filter: {
    status?: typeof moderationStatusSchema._output;
    contentType?: typeof contentTypeSchema._output;
  } = {};
  if (status) {
    const statusResult = moderationStatusSchema.safeParse(status);
    if (statusResult.success) {
      filter.status = statusResult.data;
    }
  }
  if (contentType) {
    const contentTypeResult = contentTypeSchema.safeParse(contentType);
    if (contentTypeResult.success) {
      filter.contentType = contentTypeResult.data;
    }
  }

  const result = await listModerationItems(context, {
    pagination: { page, limit },
    filter: Object.keys(filter).length > 0 ? filter : undefined,
    sort: { field: "createdAt", order: "desc" },
  });

  if (result.isErr()) {
    throw new Error(`Failed to get moderation items: ${result.error.message}`);
  }

  return result.value;
}

// TODO: This function should check if the authenticated user has permission to view moderation statistics
export async function getModerationStatistics() {
  const context = await getContext();

  const userIdResult = await context.authService.requireAuthUserId();
  if (userIdResult.isErr()) {
    throw new Error(userIdResult.error.message);
  }

  const result = await getModerationStats(context);

  if (result.isErr()) {
    throw new Error(`Failed to get moderation stats: ${result.error.message}`);
  }

  return result.value;
}

// TODO: This function should check if the authenticated user has permission to view moderation item details
export async function getModerationItemDetail(id: string) {
  const context = await getContext();

  const userIdResult = await context.authService.requireAuthUserId();
  if (userIdResult.isErr()) {
    throw new Error(userIdResult.error.message);
  }

  // Validate ID
  const idResult = moderationItemIdSchema.safeParse(id);
  if (!idResult.success) {
    throw new Error("Invalid moderation item ID");
  }

  const result = await getModerationItem(
    context,
    idResult.data as ModerationItemId,
  );

  if (result.isErr()) {
    throw new Error(`Failed to get moderation item: ${result.error.message}`);
  }

  return result.value;
}
