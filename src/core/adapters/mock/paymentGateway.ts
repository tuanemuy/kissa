import { type Result, ok } from "neverthrow";
import type {
  CancelSubscriptionParams,
  CreateCustomerParams,
  CreateSubscriptionParams,
  PaymentGateway,
  UpdateSubscriptionParams,
} from "../../domain/billing/ports/paymentGateway";
import type { SubscriptionPlan } from "../../domain/user/types";

export class MockPaymentGateway implements PaymentGateway {
  async createCustomer(
    params: CreateCustomerParams,
  ): Promise<Result<{ customerId: string }, Error>> {
    console.log("[MockPaymentGateway] Creating customer:", params);
    return ok({ customerId: `mock_customer_${Date.now()}` });
  }

  async createSubscription(
    params: CreateSubscriptionParams,
  ): Promise<Result<{ subscriptionId: string; status: string }, Error>> {
    console.log("[MockPaymentGateway] Creating subscription:", params);
    return ok({
      subscriptionId: `mock_subscription_${Date.now()}`,
      status: "active",
    });
  }

  async updateSubscription(
    params: UpdateSubscriptionParams,
  ): Promise<Result<{ subscriptionId: string; status: string }, Error>> {
    console.log("[MockPaymentGateway] Updating subscription:", params);
    return ok({
      subscriptionId: params.subscriptionId,
      status: "active",
    });
  }

  async cancelSubscription(
    params: CancelSubscriptionParams,
  ): Promise<Result<void, Error>> {
    console.log("[MockPaymentGateway] Canceling subscription:", params);
    return ok(undefined);
  }

  async getSubscriptionStatus(
    subscriptionId: string,
  ): Promise<Result<{ status: string; currentPlan: SubscriptionPlan }, Error>> {
    console.log(
      "[MockPaymentGateway] Getting subscription status:",
      subscriptionId,
    );
    return ok({
      status: "active",
      currentPlan: "basic" as SubscriptionPlan,
    });
  }
}
