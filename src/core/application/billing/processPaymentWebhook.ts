import { subscriptionPlanSchema } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { type Result, err, ok } from "neverthrow";
import { z } from "zod/v4";
import type { Context } from "../context";

export const paymentWebhookInputSchema = z.object({
  type: z.string(),
  customerId: z.string().optional(),
  subscriptionId: z.string().optional(),
  paymentIntentId: z.string().optional(),
  status: z.string().optional(),
  plan: subscriptionPlanSchema.optional(),
  amount: z.number().optional(),
});
export type PaymentWebhookInput = z.infer<typeof paymentWebhookInputSchema>;

export async function processPaymentWebhook(
  context: Context,
  input: PaymentWebhookInput,
): Promise<Result<void, ApplicationError>> {
  const parseResult = validate(paymentWebhookInputSchema, input);
  if (parseResult.isErr()) {
    return err(
      new ApplicationError("Invalid webhook input", parseResult.error),
    );
  }

  const webhook = parseResult.value;

  try {
    switch (webhook.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        return await handleSubscriptionChange(context, webhook);

      case "customer.subscription.deleted":
        return await handleSubscriptionCancellation(context, webhook);

      case "invoice.payment_succeeded":
        return await handlePaymentSuccess(context, webhook);

      case "invoice.payment_failed":
        return await handlePaymentFailure(context, webhook);

      default:
        // Ignore unknown webhook types
        return ok(undefined);
    }
  } catch (error) {
    return err(new ApplicationError("Failed to process webhook", error));
  }
}

async function handleSubscriptionChange(
  context: Context,
  webhook: PaymentWebhookInput,
): Promise<Result<void, ApplicationError>> {
  if (!webhook.customerId || !webhook.subscriptionId || !webhook.plan) {
    return err(new ApplicationError("Missing required subscription data"));
  }

  // Find user by Stripe customer ID
  const userResult = await context.userRepository.findByStripeCustomerId(
    webhook.customerId,
  );
  if (userResult.isErr()) {
    return err(new ApplicationError("Failed to find user", userResult.error));
  }

  const user = userResult.value;
  if (!user) {
    return err(new ApplicationError("User not found"));
  }

  // Update user's subscription
  const updateResult = await context.userRepository.update({
    id: user.id,
    subscription: webhook.plan,
    stripeSubscriptionId: webhook.subscriptionId,
  });

  if (updateResult.isErr()) {
    return err(
      new ApplicationError(
        "Failed to update user subscription",
        updateResult.error,
      ),
    );
  }

  // Create billing event
  await context.billingRepository.create({
    userId: user.id,
    type: "subscription_change",
    fromPlan: user.subscription,
    toPlan: webhook.plan,
    status: "completed",
    currency: "USD",
  });

  return ok(undefined);
}

async function handleSubscriptionCancellation(
  context: Context,
  webhook: PaymentWebhookInput,
): Promise<Result<void, ApplicationError>> {
  if (!webhook.customerId || !webhook.subscriptionId) {
    return err(new ApplicationError("Missing required cancellation data"));
  }

  // Find user by Stripe customer ID
  const userResult = await context.userRepository.findByStripeCustomerId(
    webhook.customerId,
  );
  if (userResult.isErr()) {
    return err(new ApplicationError("Failed to find user", userResult.error));
  }

  const user = userResult.value;
  if (!user) {
    return err(new ApplicationError("User not found"));
  }

  // Update user to free plan
  const updateResult = await context.userRepository.update({
    id: user.id,
    subscription: "free",
    stripeSubscriptionId: null,
  });

  if (updateResult.isErr()) {
    return err(
      new ApplicationError(
        "Failed to update user subscription",
        updateResult.error,
      ),
    );
  }

  // Create billing event
  await context.billingRepository.create({
    userId: user.id,
    type: "subscription_change",
    fromPlan: user.subscription,
    toPlan: "free",
    status: "completed",
    currency: "USD",
  });

  return ok(undefined);
}

async function handlePaymentSuccess(
  context: Context,
  webhook: PaymentWebhookInput,
): Promise<Result<void, ApplicationError>> {
  if (!webhook.customerId || !webhook.amount) {
    return err(new ApplicationError("Missing required payment data"));
  }

  // Find user by Stripe customer ID
  const userResult = await context.userRepository.findByStripeCustomerId(
    webhook.customerId,
  );
  if (userResult.isErr()) {
    return err(new ApplicationError("Failed to find user", userResult.error));
  }

  const user = userResult.value;
  if (!user) {
    return err(new ApplicationError("User not found"));
  }

  // Create billing event for successful payment
  await context.billingRepository.create({
    userId: user.id,
    type: "payment",
    amount: webhook.amount,
    stripePaymentId: webhook.paymentIntentId,
    status: "completed",
    currency: "USD",
  });

  return ok(undefined);
}

async function handlePaymentFailure(
  context: Context,
  webhook: PaymentWebhookInput,
): Promise<Result<void, ApplicationError>> {
  if (!webhook.customerId) {
    return err(new ApplicationError("Missing required payment failure data"));
  }

  // Find user by Stripe customer ID
  const userResult = await context.userRepository.findByStripeCustomerId(
    webhook.customerId,
  );
  if (userResult.isErr()) {
    return err(new ApplicationError("Failed to find user", userResult.error));
  }

  const user = userResult.value;
  if (!user) {
    return err(new ApplicationError("User not found"));
  }

  // Create billing event for failed payment
  await context.billingRepository.create({
    userId: user.id,
    type: "payment",
    amount: webhook.amount,
    stripePaymentId: webhook.paymentIntentId,
    status: "failed",
    currency: "USD",
  });

  return ok(undefined);
}
