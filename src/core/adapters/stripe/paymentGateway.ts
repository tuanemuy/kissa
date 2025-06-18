import { type Result, err, ok } from "neverthrow";
import Stripe from "stripe";
import type {
  CancelSubscriptionParams,
  CreateCustomerParams,
  CreateSubscriptionParams,
  PaymentGateway,
  UpdateSubscriptionParams,
} from "../../domain/billing/ports/paymentGateway";
import type { SubscriptionPlan } from "../../domain/user/types";

export interface StripeConfig {
  secretKey: string;
  basicPriceId: string;
  premiumPriceId: string;
}

export class StripePaymentGateway implements PaymentGateway {
  private stripe: Stripe;
  private planToPriceId: Record<SubscriptionPlan, string>;
  private priceIdToPlan: Record<string, SubscriptionPlan>;

  constructor(config: StripeConfig) {
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: "2025-05-28.basil",
    });

    // Plan mapping to Stripe price IDs
    this.planToPriceId = {
      free: "", // Free plan doesn't have a Stripe price ID
      basic: config.basicPriceId,
      premium: config.premiumPriceId,
    };

    this.priceIdToPlan = Object.fromEntries(
      Object.entries(this.planToPriceId).map(([plan, priceId]) => [
        priceId,
        plan as SubscriptionPlan,
      ]),
    );
  }

  async createCustomer(
    params: CreateCustomerParams,
  ): Promise<Result<{ customerId: string }, Error>> {
    try {
      const customer = await this.stripe.customers.create({
        email: params.email,
        name: params.name,
        metadata: params.metadata || {},
      });

      return ok({ customerId: customer.id });
    } catch (error) {
      return err(new Error(`Failed to create Stripe customer: ${error}`));
    }
  }

  async createSubscription(
    params: CreateSubscriptionParams,
  ): Promise<Result<{ subscriptionId: string; status: string }, Error>> {
    try {
      if (params.plan === "free") {
        return err(
          new Error("Cannot create Stripe subscription for free plan"),
        );
      }

      const priceId = this.planToPriceId[params.plan];
      if (!priceId) {
        return err(
          new Error(`No Stripe price ID configured for plan: ${params.plan}`),
        );
      }

      const subscription = await this.stripe.subscriptions.create({
        customer: params.customerId,
        items: [{ price: priceId }],
        payment_behavior: "default_incomplete",
        payment_settings: { save_default_payment_method: "on_subscription" },
        expand: ["latest_invoice.payment_intent"],
      });

      return ok({
        subscriptionId: subscription.id,
        status: subscription.status,
      });
    } catch (error) {
      return err(new Error(`Failed to create Stripe subscription: ${error}`));
    }
  }

  async updateSubscription(
    params: UpdateSubscriptionParams,
  ): Promise<Result<{ subscriptionId: string; status: string }, Error>> {
    try {
      if (params.plan === "free") {
        // Cancel subscription for free plan
        const cancelResult = await this.cancelSubscription({
          subscriptionId: params.subscriptionId,
          cancelAtPeriodEnd: false,
        });

        if (cancelResult.isErr()) {
          return err(cancelResult.error);
        }

        return ok({
          subscriptionId: params.subscriptionId,
          status: "canceled",
        });
      }

      const priceId = this.planToPriceId[params.plan];
      if (!priceId) {
        return err(
          new Error(`No Stripe price ID configured for plan: ${params.plan}`),
        );
      }

      // Get current subscription
      const subscription = await this.stripe.subscriptions.retrieve(
        params.subscriptionId,
      );
      const currentItem = subscription.items.data[0];

      if (!currentItem) {
        return err(new Error("No subscription items found"));
      }

      // Update subscription with new price
      const updatedSubscription = await this.stripe.subscriptions.update(
        params.subscriptionId,
        {
          items: [
            {
              id: currentItem.id,
              price: priceId,
            },
          ],
          proration_behavior: "create_prorations",
        },
      );

      return ok({
        subscriptionId: updatedSubscription.id,
        status: updatedSubscription.status,
      });
    } catch (error) {
      return err(new Error(`Failed to update Stripe subscription: ${error}`));
    }
  }

  async cancelSubscription(
    params: CancelSubscriptionParams,
  ): Promise<Result<void, Error>> {
    try {
      if (params.cancelAtPeriodEnd) {
        await this.stripe.subscriptions.update(params.subscriptionId, {
          cancel_at_period_end: true,
        });
      } else {
        await this.stripe.subscriptions.cancel(params.subscriptionId);
      }

      return ok(undefined);
    } catch (error) {
      return err(new Error(`Failed to cancel Stripe subscription: ${error}`));
    }
  }

  async getSubscriptionStatus(
    subscriptionId: string,
  ): Promise<Result<{ status: string; currentPlan: SubscriptionPlan }, Error>> {
    try {
      const subscription =
        await this.stripe.subscriptions.retrieve(subscriptionId);
      const currentItem = subscription.items.data[0];

      if (!currentItem) {
        return err(new Error("No subscription items found"));
      }

      const priceId = currentItem.price.id;
      const currentPlan = this.priceIdToPlan[priceId] || "basic";

      return ok({
        status: subscription.status,
        currentPlan,
      });
    } catch (error) {
      return err(
        new Error(`Failed to get Stripe subscription status: ${error}`),
      );
    }
  }
}
