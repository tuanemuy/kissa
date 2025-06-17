import type { Result } from "neverthrow";
import type { SubscriptionPlan } from "../../user/types";

export interface CreateCustomerParams {
  email: string;
  name: string;
  metadata?: Record<string, string>;
}

export interface CreateSubscriptionParams {
  customerId: string;
  plan: SubscriptionPlan;
}

export interface UpdateSubscriptionParams {
  subscriptionId: string;
  plan: SubscriptionPlan;
}

export interface CancelSubscriptionParams {
  subscriptionId: string;
  cancelAtPeriodEnd?: boolean;
}

export interface PaymentGateway {
  createCustomer(
    params: CreateCustomerParams,
  ): Promise<Result<{ customerId: string }, Error>>;
  createSubscription(
    params: CreateSubscriptionParams,
  ): Promise<Result<{ subscriptionId: string; status: string }, Error>>;
  updateSubscription(
    params: UpdateSubscriptionParams,
  ): Promise<Result<{ subscriptionId: string; status: string }, Error>>;
  cancelSubscription(
    params: CancelSubscriptionParams,
  ): Promise<Result<void, Error>>;
  getSubscriptionStatus(
    subscriptionId: string,
  ): Promise<Result<{ status: string; currentPlan: SubscriptionPlan }, Error>>;
}
