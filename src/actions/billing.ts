"use server";

import { cancelSubscription } from "@/core/application/billing/cancelSubscription";
import { changeSubscription } from "@/core/application/billing/changeSubscription";
import { getBillingHistory } from "@/core/application/billing/getBillingHistory";
import { getSubscriptionStatus } from "@/core/application/billing/getSubscriptionStatus";
import { processPaymentWebhook } from "@/core/application/billing/processPaymentWebhook";
import {
  type SubscriptionPlan,
  type UserId,
  subscriptionPlanSchema,
  userIdSchema,
} from "@/core/domain/user/types";
import { parseFormDataObject } from "@/lib/formData";
import { redirect } from "next/navigation";
import { z } from "zod/v4";
import { getContext } from "./context";

export async function changeUserSubscription(formData: FormData) {
  const context = await getContext();

  const userIdResult = await context.authService.requireAuthUserId();
  if (userIdResult.isErr()) {
    throw new Error(userIdResult.error.message);
  }
  const userId = userIdResult.value;

  const inputResult = parseFormDataObject(formData, {
    newPlan: subscriptionPlanSchema,
  });

  if (inputResult.isErr()) {
    throw new Error(`Invalid form data: ${inputResult.error.message}`);
  }

  const { newPlan } = inputResult.value;
  const result = await changeSubscription(context, { userId, newPlan } as {
    userId: UserId;
    newPlan: SubscriptionPlan;
  });

  if (result.isErr()) {
    throw new Error(`Failed to change subscription: ${result.error.message}`);
  }

  redirect("/dashboard/billing");
}

export async function cancelUserSubscription(formData: FormData) {
  const context = await getContext();

  const userIdResult = await context.authService.requireAuthUserId();
  if (userIdResult.isErr()) {
    throw new Error(userIdResult.error.message);
  }
  const userId = userIdResult.value;

  const inputResult = parseFormDataObject(formData, {
    cancelAtPeriodEnd: z.boolean().default(true),
  });

  if (inputResult.isErr()) {
    throw new Error(`Invalid form data: ${inputResult.error.message}`);
  }

  const { cancelAtPeriodEnd } = inputResult.value;
  const result = await cancelSubscription(context, {
    userId,
    cancelAtPeriodEnd,
  } as {
    userId: UserId;
    cancelAtPeriodEnd: boolean;
  });

  if (result.isErr()) {
    throw new Error(`Failed to cancel subscription: ${result.error.message}`);
  }

  redirect("/dashboard/billing");
}

export async function getUserBillingHistory(page = 1, limit = 20) {
  const context = await getContext();

  const userIdResult = await context.authService.requireAuthUserId();
  if (userIdResult.isErr()) {
    throw new Error(userIdResult.error.message);
  }
  const userId = userIdResult.value;

  const result = await getBillingHistory(context, {
    userId,
    pagination: { page, limit },
    filter: {},
  });

  if (result.isErr()) {
    throw new Error(`Failed to get billing history: ${result.error.message}`);
  }

  return result.value;
}

export async function getUserSubscriptionStatus() {
  const context = await getContext();

  const userIdResult = await context.authService.requireAuthUserId();
  if (userIdResult.isErr()) {
    throw new Error(userIdResult.error.message);
  }
  const userId = userIdResult.value;

  const result = await getSubscriptionStatus(context, {
    userId,
  });

  if (result.isErr()) {
    throw new Error(
      `Failed to get subscription status: ${result.error.message}`,
    );
  }

  return result.value;
}

export async function handlePaymentWebhook(webhookData: {
  type: string;
  customerId?: string;
  subscriptionId?: string;
  paymentIntentId?: string;
  status?: string;
  plan?: SubscriptionPlan;
  amount?: number;
}) {
  const context = await getContext();

  // This would typically be called from an API route, not a form action
  // Included here for completeness
  const result = await processPaymentWebhook(context, webhookData);

  if (result.isErr()) {
    throw new Error(`Failed to process webhook: ${result.error.message}`);
  }

  return { success: true };
}
