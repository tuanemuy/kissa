import type { Region, RegionId } from "@/core/domain/region/types";
import type { User, UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { RepositoryError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { getRegion } from "./getRegion";

describe("getRegion", () => {
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

  const visitorUser: User = {
    id: "visitor-1" as UserId,
    name: "Test Visitor",
    email: "visitor@example.com",
    role: "visitor",
    subscription: "free",
    profilePhotoUrl: null,
    isActive: true,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const publicRegion: Region = {
    id: "public-region" as RegionId,
    name: "Public Region",
    description: "A public region",
    creatorId: editorUser.id,
    isPublic: true,
    latitude: 35.6762,
    longitude: 139.6503,
    coverPhotoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const privateRegion: Region = {
    id: "private-region" as RegionId,
    name: "Private Region",
    description: "A private region",
    creatorId: editorUser.id,
    isPublic: false,
    latitude: null,
    longitude: null,
    coverPhotoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    context = {
      userRepository: {
        findById: async (id: string) => {
          if (id === editorUser.id) return ok(editorUser);
          if (id === visitorUser.id) return ok(visitorUser);
          return ok(null);
        },
      } as Partial<typeof context.userRepository>,
      regionRepository: {
        findById: async (id: string) => {
          if (id === publicRegion.id) return ok(publicRegion);
          if (id === privateRegion.id) return ok(privateRegion);
          return ok(null);
        },
      } as Partial<typeof context.regionRepository>,
    } as Context;
  });

  describe("SPEC: Region visibility constraints from Alloy model", () => {
    it("should allow anyone to view public region", async () => {
      const result = await getRegion(context, visitorUser.id, publicRegion.id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const region = result.value;
        expect(region.id).toBe(publicRegion.id);
        expect(region.name).toBe(publicRegion.name);
        expect(region.isPublic).toBe(true);
      }
    });

    it("should allow creator to view private region", async () => {
      const result = await getRegion(context, editorUser.id, privateRegion.id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const region = result.value;
        expect(region.id).toBe(privateRegion.id);
        expect(region.isPublic).toBe(false);
      }
    });

    it("should reject non-creator viewing private region", async () => {
      const result = await getRegion(context, visitorUser.id, privateRegion.id);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Region not found or not accessible");
      }
    });

    it("should allow admin to view any region", async () => {
      const adminUser: User = {
        ...visitorUser,
        id: "admin-1" as UserId,
        role: "admin",
      };

      context.userRepository = {
        findById: async (id: string) => {
          if (id === adminUser.id) return ok(adminUser);
          return ok(null);
        },
      } as Partial<typeof context.userRepository>;

      const result = await getRegion(context, adminUser.id, privateRegion.id);

      expect(result.isOk()).toBe(true);
    });
  });

  describe("TLA+ behavior validation", () => {
    it("should follow region access patterns from TLA+ specification", async () => {
      // TLA+ IsPublic predicate validation
      const result = await getRegion(context, visitorUser.id, publicRegion.id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const region = result.value;
        // Verify public visibility allows access
        expect(region.isPublic).toBe(true);
        expect(region.creatorId).toBe(editorUser.id);
      }
    });
  });

  describe("Error handling", () => {
    it("should handle region not found", async () => {
      const result = await getRegion(
        context,
        visitorUser.id,
        "non-existent" as RegionId,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Region not found or not accessible");
      }
    });

    it("should handle user not found", async () => {
      const result = await getRegion(
        context,
        "non-existent" as UserId,
        publicRegion.id,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("User not found");
      }
    });

    it("should handle repository failure", async () => {
      // biome-ignore lint/suspicious/noExplicitAny: Testing error handling requires type assertion
      const mockRegionRepository = context.regionRepository as any;
      mockRegionRepository.findById = async () =>
        err(new RepositoryError("Database error"));

      const result = await getRegion(context, visitorUser.id, publicRegion.id);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to get region");
      }
    });
  });

  describe("Anonymous access", () => {
    it("should allow anonymous access to public regions", async () => {
      // Anonymous users can view public regions per REQ-V-001
      const result = await getRegion(context, null, publicRegion.id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const region = result.value;
        expect(region.isPublic).toBe(true);
      }
    });

    it("should reject anonymous access to private regions", async () => {
      const result = await getRegion(context, null, privateRegion.id);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Region not found or not accessible");
      }
    });
  });

  describe("Region data integrity", () => {
    it("should return complete region data", async () => {
      const result = await getRegion(context, editorUser.id, publicRegion.id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const region = result.value;
        expect(region.id).toBe(publicRegion.id);
        expect(region.name).toBe(publicRegion.name);
        expect(region.description).toBe(publicRegion.description);
        expect(region.creatorId).toBe(publicRegion.creatorId);
        expect(region.latitude).toBe(publicRegion.latitude);
        expect(region.longitude).toBe(publicRegion.longitude);
        expect(region.createdAt).toBeInstanceOf(Date);
        expect(region.updatedAt).toBeInstanceOf(Date);
      }
    });
  });
});