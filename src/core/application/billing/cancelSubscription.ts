import { userIdSchema } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { type Result, err, ok } from "neverthrow";
import { z } from "zod/v4";
import type { Context } from "../context";

export const cancelSubscriptionInputSchema = z.object({
  userId: userIdSchema,
  cancelAtPeriodEnd: z.boolean().default(true),
});
export type CancelSubscriptionInput = z.infer<
  typeof cancelSubscriptionInputSchema
>;

export async function cancelSubscription(
  context: Context,
  input: CancelSubscriptionInput,
): Promise<Result<void, ApplicationError>> {
  const parseResult = validate(cancelSubscriptionInputSchema, input);
  if (parseResult.isErr()) {
    return err(
      new ApplicationError(
        "Invalid subscription cancellation input",
        parseResult.error,
      ),
    );
  }

  const { userId, cancelAtPeriodEnd } = parseResult.value;

  // Get current user
  const userResult = await context.userRepository.findById(userId);
  if (userResult.isErr()) {
    return err(new ApplicationError("Failed to get user", userResult.error));
  }

  const user = userResult.value;
  if (!user) {
    return err(new ApplicationError("User not found"));
  }

  if (!user.stripeSubscriptionId) {
    return err(new ApplicationError("User has no active subscription"));
  }

  // Record billing event as pending
  const createEventResult = await context.billingRepository.create({
    userId,
    type: "subscription_change",
    fromPlan: user.subscription,
    toPlan: "free",
    status: "pending",
    currency: "USD",
  });

  if (createEventResult.isErr()) {
    return err(
      new ApplicationError(
        "Failed to create billing event",
        createEventResult.error,
      ),
    );
  }

  const billingEvent = createEventResult.value;

  try {
    // Cancel subscription through payment gateway
    const cancelResult = await context.paymentGateway.cancelSubscription({
      subscriptionId: user.stripeSubscriptionId,
      cancelAtPeriodEnd,
    });

    if (cancelResult.isErr()) {
      // Mark billing event as failed
      await context.billingRepository.updateStatus({
        id: billingEvent.id,
        status: "failed",
      });
      return err(
        new ApplicationError(
          "Failed to cancel subscription",
          cancelResult.error,
        ),
      );
    }

    // Update user's subscription plan to free if immediate cancellation
    if (!cancelAtPeriodEnd) {
      const updatePlanResult = await context.userRepository.update({
        id: userId,
        subscription: "free",
        stripeSubscriptionId: null,
      });

      if (updatePlanResult.isErr()) {
        return err(
          new ApplicationError(
            "Failed to update user plan",
            updatePlanResult.error,
          ),
        );
      }
    }

    // Mark billing event as completed
    await context.billingRepository.updateStatus({
      id: billingEvent.id,
      status: "completed",
    });

    return ok(undefined);
  } catch (error) {
    // Mark billing event as failed on any unexpected error
    await context.billingRepository.updateStatus({
      id: billingEvent.id,
      status: "failed",
    });
    return err(new ApplicationError("Subscription cancellation failed", error));
  }
}
