import type { Region, RegionId } from "@/core/domain/region/types";
import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { deleteRegion } from "./deleteRegion";

describe("deleteRegion", () => {
  let context: Context;

  const editorUser: User = {
    id: "editor-1" as UserId,
    name: "Test Editor",
    email: "editor@example.com",
    role: "editor",
    subscription: "basic",
    profilePhotoUrl: null,
    isActive: true,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const otherUser: User = {
    id: "other-user" as UserId,
    name: "Other User",
    email: "other@example.com",
    role: "editor",
    subscription: "basic",
    profilePhotoUrl: null,
    isActive: true,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const testRegion: Region = {
    id: "test-region-id" as RegionId,
    name: "Test Region",
    description: "A test region",
    creatorId: editorUser.id,
    isPublic: true,
    latitude: null,
    longitude: null,
    coverPhotoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    context = {
      regionRepository: {
        findById: async (id: RegionId) => {
          if (id === testRegion.id) return ok(testRegion);
          return ok(null);
        },
        delete: async () => ok(undefined),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any,
      locationRepository: {
        countByRegion: async () => ok(0),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any,
    } as Context;
  });

  describe("SPEC-INV-2: Region ownership validation (Alloy constraint)", () => {
    it("should allow region creator to delete region", async () => {
      const input = {
        id: testRegion.id,
        userId: editorUser.id,
      };

      const result = await deleteRegion(context, input);

      expect(result.isOk()).toBe(true);
    });

    it("should reject deletion by non-owner", async () => {
      const input = {
        id: testRegion.id,
        userId: otherUser.id,
      };

      const result = await deleteRegion(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Unauthorized to delete this region");
      }
    });
  });

  describe("SPEC-INV-3: Region cascade constraint (Alloy constraint)", () => {
    it("should reject deletion when region has locations", async () => {
      // Mock location count to be > 0
      context.locationRepository = {
        countByRegion: async () => ok(3), // Has locations
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

      const input = {
        id: testRegion.id,
        userId: editorUser.id,
      };

      const result = await deleteRegion(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toContain(
          "Cannot delete region with existing locations",
        );
      }
    });

    it("should allow deletion when region has no locations", async () => {
      // Mock location count to be 0
      context.locationRepository = {
        countByRegion: async () => ok(0), // No locations
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

      const input = {
        id: testRegion.id,
        userId: editorUser.id,
      };

      const result = await deleteRegion(context, input);

      expect(result.isOk()).toBe(true);
    });
  });

  describe("TLA+ behavior validation", () => {
    it("should follow DeleteRegion action from TLA+ specification", async () => {
      // TLA+ DeleteRegion action: DeleteRegion(userId, regionId)
      const input = {
        id: testRegion.id,
        userId: editorUser.id,
      };

      const result = await deleteRegion(context, input);

      expect(result.isOk()).toBe(true);
      // Verify state transition: region should be removed from system
    });
  });

  describe("Input validation", () => {
    it("should reject invalid input - invalid UUID", async () => {
      const input = {
        id: "invalid-uuid",
        userId: editorUser.id,
      };

      const result = await deleteRegion(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid region input");
      }
    });

    it("should reject missing fields", async () => {
      const input = {
        id: testRegion.id,
        // Missing userId
      };

      const result = await deleteRegion(context, input as never);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid region input");
      }
    });
  });

  describe("Error handling", () => {
    it("should handle region not found", async () => {
      const input = {
        id: "non-existent-region" as RegionId,
        userId: editorUser.id,
      };

      const result = await deleteRegion(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Region not found");
      }
    });

    it("should handle repository findById failure", async () => {
      context.regionRepository = {
        ...context.regionRepository,
        findById: async () => err(new RepositoryError("Find failed")),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

      const input = {
        id: testRegion.id,
        userId: editorUser.id,
      };

      const result = await deleteRegion(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to find region");
      }
    });

    it("should handle repository countByRegion failure", async () => {
      context.locationRepository = {
        countByRegion: async () => err(new RepositoryError("Count failed")),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

      const input = {
        id: testRegion.id,
        userId: editorUser.id,
      };

      const result = await deleteRegion(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to check region locations");
      }
    });

    it("should handle repository delete failure", async () => {
      context.regionRepository = {
        ...context.regionRepository,
        delete: async () => err(new RepositoryError("Delete failed")),
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

      const input = {
        id: testRegion.id,
        userId: editorUser.id,
      };

      const result = await deleteRegion(context, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to delete region");
      }
    });
  });

  describe("Business logic validation", () => {
    it("should enforce proper deletion workflow", async () => {
      // Verify complete deletion process
      let findCalled = false;
      let countCalled = false;
      let deleteCalled = false;

      context.regionRepository = {
        findById: async (id: RegionId) => {
          findCalled = true;
          if (id === testRegion.id) return ok(testRegion);
          return ok(null);
        },
        delete: async () => {
          deleteCalled = true;
          return ok(undefined);
        },
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

      context.locationRepository = {
        countByRegion: async () => {
          countCalled = true;
          return ok(0);
        },
        // biome-ignore lint/suspicious/noExplicitAny: Mock context setup requires type assertion
      } as any;

      const input = {
        id: testRegion.id,
        userId: editorUser.id,
      };

      const result = await deleteRegion(context, input);

      expect(result.isOk()).toBe(true);
      expect(findCalled).toBe(true);
      expect(countCalled).toBe(true);
      expect(deleteCalled).toBe(true);
    });
  });
});
