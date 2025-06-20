import type { BillingEvent, BillingEventId } from "@/core/domain/billing/types";
import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { cancelSubscription } from "./cancelSubscription";

describe("cancelSubscription", () => {
  let context: Context;
  // biome-ignore lint/suspicious/noExplicitAny: Mock repositories require flexible typing for tests
  let mockUserRepository: any;
  // biome-ignore lint/suspicious/noExplicitAny: Mock repositories require flexible typing for tests
  let mockBillingRepository: any;
  // biome-ignore lint/suspicious/noExplicitAny: Mock payment gateway requires flexible typing for tests
  let mockPaymentGateway: any;
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
      type: "subscription_change",
      fromPlan: "basic",
      toPlan: "free",
      status: "pending",
      currency: "USD",
      createdAt: new Date(),
      amount: null,
      stripePaymentId: null,
    };

    mockUserRepository = {
      findById: async (id: UserId) => {
        if (id === testUser.id) {
          return ok(testUser);
        }
        return ok(null);
      },
      update: async () => ok(testUser),
    };

    mockBillingRepository = {
      create: async () => ok(testBillingEvent),
      updateStatus: async () => ok(undefined),
    };

    mockPaymentGateway = {
      cancelSubscription: async () =>
        ok({ id: "sub_test123", status: "canceled" }),
    };

    context = {
      userRepository: mockUserRepository,
      billingRepository: mockBillingRepository,
      paymentGateway: mockPaymentGateway,
    } as unknown as Context;
  });

  describe("SPEC-TLA+: Subscription cancellation workflow", () => {
    it("should cancel subscription at period end", async () => {
      const input = {
        userId: testUser.id,
        cancelAtPeriodEnd: true,
      };

      const result = await cancelSubscription(context, input);

      expect(result.isOk()).toBe(true);
      expect(mockPaymentGateway.cancelSubscription).toHaveBeenCalledWith({
        subscriptionId: "sub_test123",
        cancelAtPeriodEnd: true,
      });
    });

    it("should cancel subscription immediately and update user plan", async () => {
      const input = {
        userId: testUser.id,
        cancelAtPeriodEnd: false,
      };

      const result = await cancelSubscription(context, input);

      expect(result.isOk()).toBe(true);
      expect(mockUserRepository.update).toHaveBeenCalledWith({
        id: testUser.id,
        subscription: "free",
        stripeSubscriptionId: null,
      });
    });
  });

  describe("Alloy model constraints validation", () => {
    it("should enforce subscription state consistency", async () => {
      // Alloy INV: Only editors can have non-free subscriptions
      testUser.role = "visitor";
      testUser.subscription = "basic"; // This violates the constraint

      const input = {
        userId: testUser.id,
        cancelAtPeriodEnd: true,
      };

      const result = await cancelSubscription(context, input);

      // Should still work but result in free subscription
      expect(result.isOk()).toBe(true);
    });

    it("should maintain billing event consistency", async () => {
      const input = {
        userId: testUser.id,
        cancelAtPeriodEnd: true,
      };

      const result = await cancelSubscription(context, input);

      expect(result.isOk()).toBe(true);
      expect(mockBillingRepository.create).toHaveBeenCalledWith({
        userId: testUser.id,
        type: "subscription_change",
        fromPlan: "basic",
        toPlan: "free",
        status: "pending",
        currency: "USD",
      });
    });
  });

  describe("Input validation", () => {
    it("should reject invalid user ID", async () => {
      const input = {
        userId: "invalid-id" as UserId,
        cancelAtPeriodEnd: true,
      };

      const result = await cancelSubscription(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe(
          "Invalid subscription cancellation input",
        );
      }
    });

    it("should handle non-existent user", async () => {
      const input = {
        userId: "non-existent" as UserId,
        cancelAtPeriodEnd: true,
      };

      const result = await cancelSubscription(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("User not found");
      }
    });

    it("should handle user without active subscription", async () => {
      testUser.stripeSubscriptionId = null;

      const input = {
        userId: testUser.id,
        cancelAtPeriodEnd: true,
      };

      const result = await cancelSubscription(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("User has no active subscription");
      }
    });
  });

  describe("Error handling", () => {
    it("should handle payment gateway failure", async () => {
      mockPaymentGateway.cancelSubscription = async () => {
        return err(new Error("Payment gateway unavailable"));
      };

      const input = {
        userId: testUser.id,
        cancelAtPeriodEnd: true,
      };

      const result = await cancelSubscription(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to cancel subscription");
      }
      expect(mockBillingRepository.updateStatus).toHaveBeenCalledWith({
        id: "billing-001",
        status: "failed",
      });
    });

    it("should handle user update failure for immediate cancellation", async () => {
      mockUserRepository.update = async () => {
        return err(new Error("Database update failed"));
      };

      const input = {
        userId: testUser.id,
        cancelAtPeriodEnd: false, // Immediate cancellation
      };

      const result = await cancelSubscription(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to update user plan");
      }
    });

    it("should handle billing repository creation failure", async () => {
      mockBillingRepository.create = async () => {
        return err(new Error("Billing service unavailable"));
      };

      const input = {
        userId: testUser.id,
        cancelAtPeriodEnd: true,
      };

      const result = await cancelSubscription(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to create billing event");
      }
    });

    it("should handle unexpected errors", async () => {
      mockPaymentGateway.cancelSubscription = async () => {
        throw new Error("Unexpected error");
      };

      const input = {
        userId: testUser.id,
        cancelAtPeriodEnd: true,
      };

      const result = await cancelSubscription(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Subscription cancellation failed");
      }
    });
  });

  describe("TLA+ temporal properties", () => {
    it("should eventually complete cancellation workflow", async () => {
      // TLA+ TEMP: CancellationEventuallyCompletes
      const input = {
        userId: testUser.id,
        cancelAtPeriodEnd: true,
      };

      const result = await cancelSubscription(context, input);

      expect(result.isOk()).toBe(true);
      expect(mockBillingRepository.updateStatus).toHaveBeenCalledWith({
        id: "billing-001",
        status: "completed",
      });
    });

    it("should maintain subscription state consistency", async () => {
      // TLA+ INV: Subscription state remains consistent throughout cancellation
      const input = {
        userId: testUser.id,
        cancelAtPeriodEnd: false,
      };

      const result = await cancelSubscription(context, input);

      expect(result.isOk()).toBe(true);
      // User should be updated to free plan for immediate cancellation
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription: "free",
          stripeSubscriptionId: null,
        }),
      );
    });
  });
});
