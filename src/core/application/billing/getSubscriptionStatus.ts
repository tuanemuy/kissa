import { type SubscriptionPlan, userIdSchema } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { type Result, err, ok } from "neverthrow";
import { z } from "zod/v4";
import type { Context } from "../context";

export const getSubscriptionStatusInputSchema = z.object({
  userId: userIdSchema,
});
export type GetSubscriptionStatusInput = z.infer<
  typeof getSubscriptionStatusInputSchema
>;

export type SubscriptionStatusResult = {
  plan: SubscriptionPlan;
  stripeStatus?: string;
  isActive: boolean;
  canUpgrade: boolean;
  canDowngrade: boolean;
};

export async function getSubscriptionStatus(
  context: Context,
  input: GetSubscriptionStatusInput,
): Promise<Result<SubscriptionStatusResult, ApplicationError>> {
  const parseResult = validate(getSubscriptionStatusInputSchema, input);
  if (parseResult.isErr()) {
    return err(
      new ApplicationError(
        "Invalid subscription status input",
        parseResult.error,
      ),
    );
  }

  const { userId } = parseResult.value;

  // Get current user
  const userResult = await context.userRepository.findById(userId);
  if (userResult.isErr()) {
    return err(new ApplicationError("Failed to get user", userResult.error));
  }

  const user = userResult.value;
  if (!user) {
    return err(new ApplicationError("User not found"));
  }

  let stripeStatus: string | undefined;

  // Get status from payment gateway if subscription exists
  if (user.stripeSubscriptionId) {
    const statusResult = await context.paymentGateway.getSubscriptionStatus(
      user.stripeSubscriptionId,
    );

    if (statusResult.isOk()) {
      stripeStatus = statusResult.value.status;

      // Sync plan if different from Stripe
      if (statusResult.value.currentPlan !== user.subscription) {
        await context.userRepository.update({
          id: userId,
          subscription: statusResult.value.currentPlan,
        });
      }
    }
  }

  const currentPlan = user.subscription;
  const isActive =
    currentPlan !== "free" &&
    (stripeStatus === "active" || stripeStatus === undefined);

  // Determine upgrade/downgrade possibilities
  const canUpgrade = currentPlan === "free" || currentPlan === "basic";
  const canDowngrade = currentPlan === "premium" || currentPlan === "basic";

  return ok({
    plan: currentPlan,
    stripeStatus,
    isActive,
    canUpgrade,
    canDowngrade,
  });
}
