import { billingEventTypeSchema } from "@/core/domain/billing/types";
import { subscriptionPlanSchema, userIdSchema } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { validate } from "@/lib/validation";
import { type Result, err, ok } from "neverthrow";
import { z } from "zod/v4";
import type { Context } from "../context";

export const changeSubscriptionInputSchema = z.object({
  userId: userIdSchema,
  newPlan: subscriptionPlanSchema,
});
export type ChangeSubscriptionInput = z.infer<
  typeof changeSubscriptionInputSchema
>;

export async function changeSubscription(
  context: Context,
  input: ChangeSubscriptionInput,
): Promise<Result<void, ApplicationError>> {
  const parseResult = validate(changeSubscriptionInputSchema, input);
  if (parseResult.isErr()) {
    return err(
      new ApplicationError(
        "Invalid subscription change input",
        parseResult.error,
      ),
    );
  }

  const { userId, newPlan } = parseResult.value;

  // Get current user to check current subscription
  const userResult = await context.userRepository.findById(userId);
  if (userResult.isErr()) {
    return err(new ApplicationError("Failed to get user", userResult.error));
  }

  const user = userResult.value;
  if (!user) {
    return err(new ApplicationError("User not found"));
  }

  const currentPlan = user.subscription;

  // Skip if already on the same plan
  if (currentPlan === newPlan) {
    return ok(undefined);
  }

  // Create customer if needed
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const createCustomerResult = await context.paymentGateway.createCustomer({
      email: user.email,
      name: user.name,
      metadata: { userId: user.id },
    });

    if (createCustomerResult.isErr()) {
      return err(
        new ApplicationError(
          "Failed to create customer",
          createCustomerResult.error,
        ),
      );
    }

    customerId = createCustomerResult.value.customerId;

    // Update user with stripe customer ID
    const updateUserResult = await context.userRepository.update({
      id: userId,
      stripeCustomerId: customerId,
    });

    if (updateUserResult.isErr()) {
      return err(
        new ApplicationError("Failed to update user", updateUserResult.error),
      );
    }
  }

  // Record billing event as pending
  const createEventResult = await context.billingRepository.create({
    userId,
    type: "subscription_change",
    fromPlan: currentPlan,
    toPlan: newPlan,
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
    // Handle subscription change through payment gateway
    if (user.stripeSubscriptionId) {
      // Update existing subscription
      const updateResult = await context.paymentGateway.updateSubscription({
        subscriptionId: user.stripeSubscriptionId,
        plan: newPlan,
      });

      if (updateResult.isErr()) {
        // Mark billing event as failed
        await context.billingRepository.updateStatus({
          id: billingEvent.id,
          status: "failed",
        });
        return err(
          new ApplicationError(
            "Failed to update subscription",
            updateResult.error,
          ),
        );
      }
    } else {
      // Create new subscription
      const createResult = await context.paymentGateway.createSubscription({
        customerId,
        plan: newPlan,
      });

      if (createResult.isErr()) {
        // Mark billing event as failed
        await context.billingRepository.updateStatus({
          id: billingEvent.id,
          status: "failed",
        });
        return err(
          new ApplicationError(
            "Failed to create subscription",
            createResult.error,
          ),
        );
      }

      // Update user with subscription ID
      const updateUserResult = await context.userRepository.update({
        id: userId,
        stripeSubscriptionId: createResult.value.subscriptionId,
      });

      if (updateUserResult.isErr()) {
        return err(
          new ApplicationError(
            "Failed to update user subscription",
            updateUserResult.error,
          ),
        );
      }
    }

    // Update user's subscription plan
    const updatePlanResult = await context.userRepository.update({
      id: userId,
      subscription: newPlan,
    });

    if (updatePlanResult.isErr()) {
      return err(
        new ApplicationError(
          "Failed to update user plan",
          updatePlanResult.error,
        ),
      );
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
    return err(new ApplicationError("Subscription change failed", error));
  }
}
