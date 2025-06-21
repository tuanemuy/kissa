import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { createMockContext } from "../testUtils/mockContext";
import { getSubscriptionStatus } from "./getSubscriptionStatus";

describe("getSubscriptionStatus", () => {
  let context: Context;
  let mockUser: User;
  // biome-ignore lint/suspicious/noExplicitAny: Mock repository doesn't have typed interface
  let mockUserRepository: any;
  // biome-ignore lint/suspicious/noExplicitAny: Mock service doesn't have typed interface
  let mockPaymentGateway: any;

  beforeEach(() => {
    mockUser = {
      id: "user-1" as UserId,
      name: "Test User",
      email: "test@example.com",
      role: "editor",
      subscription: "basic",
      profilePhotoUrl: null,
      isActive: true,
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockUserRepository = {
      findById: async () => ok(mockUser),
      update: async () => ok(mockUser),
      create: async () => ok(mockUser),
      list: async () => ok({ items: [], count: 0 }),
      findByEmail: async () => ok(null),
      findByStripeCustomerId: async () => ok(null),
      delete: async () => ok(undefined),
    };

    mockPaymentGateway = {
      getSubscriptionStatus: async () =>
        ok({
          status: "active",
          currentPlan: "basic" as const,
        }),
      createCustomer: async () => ok({ customerId: "cus_new" }),
      createSubscription: async () =>
        ok({ subscriptionId: "sub_new", status: "active" }),
      updateSubscription: async () =>
        ok({ subscriptionId: "sub_123", status: "active" }),
      cancelSubscription: async () => ok(undefined),
      processWebhook: async () => ok({ type: "subscription_change" }),
      getPaymentHistory: async () => ok([]),
    };

    context = createMockContext({
      userRepository: mockUserRepository,
      paymentGateway: mockPaymentGateway,
    });
  });

  describe("TLA+ behavior validation", () => {
    describe("ViewBillingHistory workflow", () => {
      it("should follow TLA+ user validation constraints", async () => {
        // TLA+: userId ∈ users ∧ IsEditor(userId) ∧ IsActiveUser(userId)
        mockUser.role = "editor";
        mockUser.isActive = true;

        const input = {
          userId: mockUser.id,
        };

        const result = await getSubscriptionStatus(context, input);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.plan).toBe("basic");
          expect(result.value.isActive).toBe(true);
        }
      });

      it("should handle subscription status check per TLA+ constraints", async () => {
        // TLA+: userBillingHistory = {b ∈ billingRecords : b.userId = userId}
        const input = {
          userId: mockUser.id,
        };

        const result = await getSubscriptionStatus(context, input);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.stripeStatus).toBe("active");
        }
      });
    });

    describe("ProcessSubscriptionBilling workflow", () => {
      it("should validate billing status per TLA+ model", async () => {
        // TLA+: billing status consistency
        const input = {
          userId: mockUser.id,
        };

        const result = await getSubscriptionStatus(context, input);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.plan).toBe(mockUser.subscription);
        }
      });
    });
  });

  describe("Alloy structural constraints", () => {
    describe("INV-22: Billing record consistency", () => {
      it("should maintain billing consistency per Alloy constraints", async () => {
        // Alloy: all br: BillingRecord | br.user.role = Editor and br.plan = br.user.subscriptionPlan
        mockUser.role = "editor";
        mockUser.subscription = "premium";

        const input = {
          userId: mockUser.id,
        };

        const result = await getSubscriptionStatus(context, input);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.plan).toBe("premium");
        }
      });
    });

    describe("INV-2: Only editors have subscriptions", () => {
      it("should handle free plan for non-editors per Alloy", async () => {
        // Alloy: all u: User | (u.role = Visitor or u.role = Admin) implies u.subscriptionPlan = Free
        mockUser.role = "visitor";
        mockUser.subscription = "free";
        mockUser.stripeSubscriptionId = null;

        const input = {
          userId: mockUser.id,
        };

        const result = await getSubscriptionStatus(context, input);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.plan).toBe("free");
          expect(result.value.isActive).toBe(false); // Free plan is not "active" paid plan
        }
      });
    });

    describe("INV-16-18: Subscription plan limits", () => {
      it("should indicate upgrade availability for free plan", async () => {
        mockUser.subscription = "free";

        const input = {
          userId: mockUser.id,
        };

        const result = await getSubscriptionStatus(context, input);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.canUpgrade).toBe(true);
          expect(result.value.canDowngrade).toBe(false);
        }
      });

      it("should indicate upgrade/downgrade availability for basic plan", async () => {
        mockUser.subscription = "basic";

        const input = {
          userId: mockUser.id,
        };

        const result = await getSubscriptionStatus(context, input);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.canUpgrade).toBe(true);
          expect(result.value.canDowngrade).toBe(true);
        }
      });

      it("should indicate downgrade availability for premium plan", async () => {
        mockUser.subscription = "premium";

        const input = {
          userId: mockUser.id,
        };

        const result = await getSubscriptionStatus(context, input);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.canUpgrade).toBe(false);
          expect(result.value.canDowngrade).toBe(true);
        }
      });
    });
  });

  describe("Stripe synchronization", () => {
    it("should sync plan from Stripe when different", async () => {
      mockUser.subscription = "basic";

      mockPaymentGateway.getSubscriptionStatus = async () =>
        ok({
          status: "active",
          currentPlan: "premium" as const,
        });

      let updateCalled = false;
      mockUserRepository.update = async (params: {
        id: UserId;
        subscription: string;
      }) => {
        updateCalled = true;
        expect(params.id).toBe(mockUser.id);
        expect(params.subscription).toBe("premium");
        return ok({ ...mockUser, subscription: "premium" as const });
      };

      const input = {
        userId: mockUser.id,
      };

      const result = await getSubscriptionStatus(context, input);

      expect(result.isOk()).toBe(true);
      expect(updateCalled).toBe(true);
    });

    it("should handle users without Stripe subscription", async () => {
      mockUser.stripeSubscriptionId = null;

      const input = {
        userId: mockUser.id,
      };

      const result = await getSubscriptionStatus(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.stripeStatus).toBeUndefined();
        expect(result.value.plan).toBe(mockUser.subscription);
      }
    });

    it("should handle Stripe API failure gracefully", async () => {
      mockPaymentGateway.getSubscriptionStatus = async () =>
        err(new Error("Stripe API error"));

      const input = {
        userId: mockUser.id,
      };

      const result = await getSubscriptionStatus(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.stripeStatus).toBeUndefined();
        expect(result.value.plan).toBe(mockUser.subscription);
      }
    });
  });

  describe("Status determination logic", () => {
    it("should consider paid plans with active Stripe status as active", async () => {
      mockUser.subscription = "premium";

      mockPaymentGateway.getSubscriptionStatus = async () =>
        ok({
          status: "active",
          currentPlan: "premium" as const,
        });

      const input = {
        userId: mockUser.id,
      };

      const result = await getSubscriptionStatus(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isActive).toBe(true);
        expect(result.value.stripeStatus).toBe("active");
      }
    });

    it("should consider free plan as inactive", async () => {
      mockUser.subscription = "free";
      mockUser.stripeSubscriptionId = null;

      const input = {
        userId: mockUser.id,
      };

      const result = await getSubscriptionStatus(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isActive).toBe(false);
      }
    });

    it("should handle suspended Stripe subscriptions", async () => {
      mockUser.subscription = "basic";

      mockPaymentGateway.getSubscriptionStatus = async () =>
        ok({
          status: "past_due",
          currentPlan: "basic" as const,
        });

      const input = {
        userId: mockUser.id,
      };

      const result = await getSubscriptionStatus(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isActive).toBe(false);
        expect(result.value.stripeStatus).toBe("past_due");
      }
    });
  });

  describe("Error handling", () => {
    it("should handle user not found", async () => {
      mockUserRepository.findById = async () => ok(null);

      const input = {
        userId: mockUser.id,
      };

      const result = await getSubscriptionStatus(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("User not found");
      }
    });

    it("should handle repository failure", async () => {
      mockUserRepository.findById = async () =>
        err(new RepositoryError("Database error"));

      const input = {
        userId: mockUser.id,
      };

      const result = await getSubscriptionStatus(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to get user");
      }
    });
  });

  describe("Input validation", () => {
    it("should reject invalid input", async () => {
      const input = {
        // biome-ignore lint/suspicious/noExplicitAny: Testing invalid input requires type assertion
        userId: "invalid-user-id" as any,
      };

      const result = await getSubscriptionStatus(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid subscription status input");
      }
    });
  });

  describe("Spec scenario validation", () => {
    describe("SubscriptionManagement scenario", () => {
      it("should support subscription status check per Alloy spec", async () => {
        // Alloy: SubscriptionManagement scenario
        mockUser.role = "editor";
        mockUser.subscription = "basic";

        const input = {
          userId: mockUser.id,
        };

        const result = await getSubscriptionStatus(context, input);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.plan).toBe("basic");
          expect(result.value.canUpgrade).toBe(true);
          expect(result.value.canDowngrade).toBe(true);
        }
      });
    });

    describe("SubscriptionLimitsTest scenario", () => {
      it("should validate free plan limitations per Alloy spec", async () => {
        // Alloy: SubscriptionLimitsTest - free plan constraints
        mockUser.subscription = "free";

        const input = {
          userId: mockUser.id,
        };

        const result = await getSubscriptionStatus(context, input);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.plan).toBe("free");
          expect(result.value.canUpgrade).toBe(true);
          expect(result.value.canDowngrade).toBe(false);
        }
      });
    });
  });

  describe("Business logic validation", () => {
    it("should correctly determine upgrade possibilities", async () => {
      const testCases = [
        { plan: "free" as const, canUpgrade: true, canDowngrade: false },
        { plan: "basic" as const, canUpgrade: true, canDowngrade: true },
        { plan: "premium" as const, canUpgrade: false, canDowngrade: true },
      ];

      for (const testCase of testCases) {
        mockUser.subscription = testCase.plan;

        const input = {
          userId: mockUser.id,
        };

        const result = await getSubscriptionStatus(context, input);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.canUpgrade).toBe(testCase.canUpgrade);
          expect(result.value.canDowngrade).toBe(testCase.canDowngrade);
        }
      }
    });

    it("should handle plan synchronization correctly", async () => {
      mockUser.subscription = "basic";

      mockPaymentGateway.getSubscriptionStatus = async () =>
        ok({
          status: "active",
          currentPlan: "premium" as const,
        });

      const input = {
        userId: mockUser.id,
      };

      const result = await getSubscriptionStatus(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Should reflect the Stripe status, not the local status
        expect(result.value.isActive).toBe(true);
        expect(result.value.stripeStatus).toBe("active");
      }
    });
  });
});
