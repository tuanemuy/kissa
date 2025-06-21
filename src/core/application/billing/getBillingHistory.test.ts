import type { BillingEvent, BillingEventId } from "@/core/domain/billing/types";
import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { createMockContext } from "../testUtils/mockContext";
import { getBillingHistory } from "./getBillingHistory";

describe("getBillingHistory", () => {
  let context: Context;
  // biome-ignore lint/suspicious/noExplicitAny: Mock repositories require flexible typing for tests
  let mockUserRepository: any;
  // biome-ignore lint/suspicious/noExplicitAny: Mock repositories require flexible typing for tests
  let mockBillingRepository: any;
  let testUser: User;
  let testBillingEvents: BillingEvent[];

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

    testBillingEvents = [
      {
        id: "billing-001" as BillingEventId,
        userId: testUser.id,
        type: "payment",
        amount: 2000, // $20.00
        status: "completed",
        currency: "USD",
        createdAt: new Date(),
        fromPlan: null,
        toPlan: null,
        stripePaymentId: null,
      },
      {
        id: "billing-002" as BillingEventId,
        userId: testUser.id,
        type: "subscription_change",
        fromPlan: "free",
        toPlan: "basic",
        status: "completed",
        currency: "USD",
        createdAt: new Date(),
        amount: null,
        stripePaymentId: null,
      },
    ];

    mockUserRepository = {
      findById: async (id: UserId) => {
        if (id === testUser.id) {
          return ok(testUser);
        }
        return ok(null);
      },
    };

    mockBillingRepository = {
      list: async () =>
        ok({
          items: testBillingEvents,
          count: testBillingEvents.length,
        }),
      calculateTotalSpent: async () => ok(2000), // $20.00 total
    };

    context = createMockContext({
      userRepository: mockUserRepository,
      billingRepository: mockBillingRepository,
    });
  });

  describe("SPEC-TLA+: Billing history retrieval", () => {
    it("should retrieve billing history with default pagination", async () => {
      const input = {
        userId: testUser.id,
        pagination: { page: 1, limit: 20 },
        filter: {},
      };

      const result = await getBillingHistory(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const history = result.value;
        expect(history.items).toHaveLength(2);
        expect(history.count).toBe(2);
        expect(history.totalSpent).toBe(2000);
        expect(history.items[0].userId).toBe(testUser.id);
      }
    });

    it("should apply pagination correctly", async () => {
      const input = {
        userId: testUser.id,
        pagination: {
          page: 1,
          limit: 1,
        },
        filter: {},
      };

      const result = await getBillingHistory(context, input);

      expect(result.isOk()).toBe(true);
      expect(mockBillingRepository.list).toHaveBeenCalledWith({
        pagination: { page: 1, limit: 1 },
        filter: { userId: testUser.id },
      });
    });

    it("should apply date filters", async () => {
      const fromDate = new Date("2024-01-01");
      const toDate = new Date("2024-12-31");

      const input = {
        userId: testUser.id,
        pagination: { page: 1, limit: 20 },
        filter: {
          fromDate,
          toDate,
        },
      };

      const result = await getBillingHistory(context, input);

      expect(result.isOk()).toBe(true);
      expect(mockBillingRepository.calculateTotalSpent).toHaveBeenCalledWith(
        testUser.id,
        fromDate,
        toDate,
      );
    });
  });

  describe("Alloy model constraints validation", () => {
    it("should enforce billing record consistency", async () => {
      // Alloy INV: All billing records must belong to valid users
      const input = {
        userId: testUser.id,
        pagination: { page: 1, limit: 20 },
        filter: {},
      };

      const result = await getBillingHistory(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        for (const event of result.value.items) {
          expect(event.userId).toBe(testUser.id);
        }
      }
    });

    it("should maintain currency consistency", async () => {
      // Alloy INV: All billing events should have consistent currency
      const input = {
        userId: testUser.id,
        pagination: { page: 1, limit: 20 },
        filter: {},
      };

      const result = await getBillingHistory(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        for (const event of result.value.items) {
          expect(event.currency).toBe("USD");
        }
      }
    });
  });

  describe("Input validation", () => {
    it("should reject invalid user ID", async () => {
      const input = {
        userId: "invalid-id" as UserId,
        pagination: { page: 1, limit: 20 },
        filter: {},
      };

      const result = await getBillingHistory(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid billing history input");
      }
    });

    it("should handle non-existent user", async () => {
      const input = {
        userId: "non-existent" as UserId,
        pagination: { page: 1, limit: 20 },
        filter: {},
      };

      const result = await getBillingHistory(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("User not found");
      }
    });

    it("should validate pagination limits", async () => {
      const input = {
        userId: testUser.id,
        pagination: {
          page: 1,
          limit: 1000, // Exceeds max limit of 100
        },
        filter: {},
      };

      const result = await getBillingHistory(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid billing history input");
      }
    });
  });

  describe("Error handling", () => {
    it("should handle repository failure", async () => {
      mockBillingRepository.list = async () => {
        return err(new Error("Database connection failed"));
      };

      const input = {
        userId: testUser.id,
        pagination: { page: 1, limit: 20 },
        filter: {},
      };

      const result = await getBillingHistory(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to get billing history");
      }
    });

    it("should handle total calculation failure", async () => {
      mockBillingRepository.calculateTotalSpent = async () => {
        return err(new Error("Calculation service unavailable"));
      };

      const input = {
        userId: testUser.id,
        pagination: { page: 1, limit: 20 },
        filter: {},
      };

      const result = await getBillingHistory(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to calculate total spent");
      }
    });
  });

  describe("TLA+ temporal properties", () => {
    it("should eventually return billing history", async () => {
      // TLA+ TEMP: BillingHistoryEventuallyReturned
      const input = {
        userId: testUser.id,
        pagination: { page: 1, limit: 20 },
        filter: {},
      };

      const result = await getBillingHistory(context, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.items).toBeDefined();
        expect(result.value.count).toBeGreaterThanOrEqual(0);
        expect(result.value.totalSpent).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
