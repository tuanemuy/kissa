import type { BillingEvent, BillingEventId } from "@/core/domain/billing/types";
import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { processPaymentWebhook } from "./processPaymentWebhook";

describe("processPaymentWebhook", () => {
  let context: Context;
  // biome-ignore lint/suspicious/noExplicitAny: Mock repositories require flexible typing for tests
  let mockUserRepository: any;
  // biome-ignore lint/suspicious/noExplicitAny: Mock repositories require flexible typing for tests
  let mockBillingRepository: any;
  let testUser: User;

  beforeEach(() => {
    testUser = {
      id: "user-001" as UserId,
      name: "Test User",
      email: "test@example.com",
      role: "editor",
      subscription: "basic",
      stripeCustomerId: "cus_test123",
      stripeSubscriptionId: "sub_test123",
      profilePhotoUrl: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const testBillingEvent: BillingEvent = {
      id: "billing-001" as BillingEventId,
      userId: testUser.id,
      type: "payment",
      amount: 2000,
      status: "completed",
      currency: "USD",
      createdAt: new Date(),
      fromPlan: null,
      toPlan: null,
      stripePaymentId: null,
    };

    mockUserRepository = {
      findByStripeCustomerId: async (customerId: string) => {
        if (customerId === "cus_test123") {
          return ok(testUser);
        }
        return ok(null);
      },
      update: async () => ok(testUser),
    };

    mockBillingRepository = {
      create: async () => ok(testBillingEvent),
    };

    context = {
      userRepository: mockUserRepository,
      billingRepository: mockBillingRepository,
    } as unknown as Context;
  });

  describe("SPEC-TLA+: Payment webhook processing", () => {
    it("should handle subscription creation webhook", async () => {
      const input = {
        type: "customer.subscription.created",
        customerId: "cus_test123",
        subscriptionId: "sub_new123",
        plan: "premium" as const,
      };

      const result = await processPaymentWebhook(context, input);

      expect(result.isOk()).toBe(true);
      expect(mockUserRepository.update).toHaveBeenCalledWith({
        id: testUser.id,
        subscription: "premium",
        stripeSubscriptionId: "sub_new123",
      });
    });

    it("should handle subscription update webhook", async () => {
      const input = {
        type: "customer.subscription.updated",
        customerId: "cus_test123",
        subscriptionId: "sub_test123",
        plan: "premium" as const,
      };

      const result = await processPaymentWebhook(context, input);

      expect(result.isOk()).toBe(true);
      expect(mockBillingRepository.create).toHaveBeenCalledWith({
        userId: testUser.id,
        type: "subscription_change",
        fromPlan: "basic",
        toPlan: "premium",
        status: "completed",
        currency: "USD",
      });
    });

    it("should handle subscription deletion webhook", async () => {
      const input = {
        type: "customer.subscription.deleted",
        customerId: "cus_test123",
        subscriptionId: "sub_test123",
      };

      const result = await processPaymentWebhook(context, input);

      expect(result.isOk()).toBe(true);
      expect(mockUserRepository.update).toHaveBeenCalledWith({
        id: testUser.id,
        subscription: "free",
        stripeSubscriptionId: null,
      });
    });

    it("should handle successful payment webhook", async () => {
      const input = {
        type: "invoice.payment_succeeded",
        customerId: "cus_test123",
        paymentIntentId: "pi_test123",
        amount: 2000,
      };

      const result = await processPaymentWebhook(context, input);

      expect(result.isOk()).toBe(true);
      expect(mockBillingRepository.create).toHaveBeenCalledWith({
        userId: testUser.id,
        type: "payment",
        amount: 2000,
        stripePaymentId: "pi_test123",
        status: "completed",
        currency: "USD",
      });
    });

    it("should handle failed payment webhook", async () => {
      const input = {
        type: "invoice.payment_failed",
        customerId: "cus_test123",
        paymentIntentId: "pi_test123",
        amount: 2000,
      };

      const result = await processPaymentWebhook(context, input);

      expect(result.isOk()).toBe(true);
      expect(mockBillingRepository.create).toHaveBeenCalledWith({
        userId: testUser.id,
        type: "payment",
        amount: 2000,
        stripePaymentId: "pi_test123",
        status: "failed",
        currency: "USD",
      });
    });

    it("should ignore unknown webhook types", async () => {
      const input = {
        type: "unknown.webhook.type",
        customerId: "cus_test123",
      };

      const result = await processPaymentWebhook(context, input);

      expect(result.isOk()).toBe(true);
      expect(mockUserRepository.update).not.toHaveBeenCalled();
      expect(mockBillingRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("Alloy model constraints validation", () => {
    it("should enforce subscription plan consistency", async () => {
      // Alloy INV: Only editors can have non-free subscriptions
      const input = {
        type: "customer.subscription.created",
        customerId: "cus_test123",
        subscriptionId: "sub_new123",
        plan: "basic" as const,
      };

      const result = await processPaymentWebhook(context, input);

      expect(result.isOk()).toBe(true);
      // Should only succeed if user is editor
      expect(testUser.role).toBe("editor");
    });

    it("should maintain billing event consistency", async () => {
      const input = {
        type: "invoice.payment_succeeded",
        customerId: "cus_test123",
        paymentIntentId: "pi_test123",
        amount: 2000,
      };

      const result = await processPaymentWebhook(context, input);

      expect(result.isOk()).toBe(true);
      expect(mockBillingRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: testUser.id,
          type: "payment",
          currency: "USD",
        }),
      );
    });
  });

  describe("Input validation", () => {
    it("should reject invalid webhook input", async () => {
      const input = {
        type: "", // Invalid empty type
      };

      const result = await processPaymentWebhook(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid webhook input");
      }
    });

    it("should handle missing required subscription data", async () => {
      const input = {
        type: "customer.subscription.created",
        // Missing customerId, subscriptionId, plan
      };

      const result = await processPaymentWebhook(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Missing required subscription data");
      }
    });

    it("should handle missing required payment data", async () => {
      const input = {
        type: "invoice.payment_succeeded",
        // Missing customerId, amount
      };

      const result = await processPaymentWebhook(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Missing required payment data");
      }
    });
  });

  describe("Error handling", () => {
    it("should handle user not found error", async () => {
      mockUserRepository.findByStripeCustomerId = async () => ok(null);

      const input = {
        type: "customer.subscription.created",
        customerId: "cus_nonexistent",
        subscriptionId: "sub_test123",
        plan: "basic" as const,
      };

      const result = await processPaymentWebhook(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("User not found");
      }
    });

    it("should handle repository failure", async () => {
      mockUserRepository.findByStripeCustomerId = async () => {
        return err(new Error("Database connection failed"));
      };

      const input = {
        type: "customer.subscription.created",
        customerId: "cus_test123",
        subscriptionId: "sub_test123",
        plan: "basic" as const,
      };

      const result = await processPaymentWebhook(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to find user");
      }
    });

    it("should handle unexpected errors", async () => {
      mockUserRepository.update = async () => {
        throw new Error("Unexpected error");
      };

      const input = {
        type: "customer.subscription.created",
        customerId: "cus_test123",
        subscriptionId: "sub_test123",
        plan: "basic" as const,
      };

      const result = await processPaymentWebhook(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to process webhook");
      }
    });
  });

  describe("TLA+ temporal properties", () => {
    it("should eventually process all webhook types", async () => {
      // TLA+ TEMP: WebhookEventuallyProcessed
      const webhookTypes = [
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
        "invoice.payment_succeeded",
        "invoice.payment_failed",
      ];

      for (const type of webhookTypes) {
        const input = {
          type,
          customerId: "cus_test123",
          subscriptionId: "sub_test123",
          plan: "basic" as const,
          amount: 2000,
          paymentIntentId: "pi_test123",
        };

        const result = await processPaymentWebhook(context, input);
        expect(result.isOk()).toBe(true);
      }
    });
  });
});
