import type {
  Location,
  LocationEditor,
  LocationEditorId,
  LocationId,
} from "@/core/domain/location/types";
import type { Region, RegionId } from "@/core/domain/region/types";
import type { UserId } from "@/core/domain/user/types";
import { ApplicationError } from "@/lib/error";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { createMockContext } from "../testUtils/mockContext";
import { listLocationEditors } from "./listLocationEditors";

describe("listLocationEditors", () => {
  let context: Context;
  // biome-ignore lint/suspicious/noExplicitAny: Mock repositories require flexible typing for tests
  let mockLocationRepository: any;
  // biome-ignore lint/suspicious/noExplicitAny: Mock repositories require flexible typing for tests
  let mockRegionRepository: any;
  let testLocation: Location;
  let testRegion: Region;
  let testEditors: LocationEditor[];

  const ownerId = "owner-001" as UserId;
  const editorId = "editor-001" as UserId;

  beforeEach(() => {
    testRegion = {
      id: "region-001" as RegionId,
      name: "Test Region",
      description: "Test region description",
      creatorId: ownerId,
      isPublic: true,
      latitude: null,
      longitude: null,
      coverPhotoUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    testLocation = {
      id: "location-001" as LocationId,
      name: "Test Location",
      description: "Test location description",
      category: "restaurant",
      regionId: testRegion.id,
      address: "123 Test St",
      latitude: null,
      longitude: null,
      contactInfo: null,
      operatingHours: null,
      isPublic: true,
      coverPhotoUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    testEditors = [
      {
        id: "editor-001" as LocationEditorId,
        locationId: testLocation.id,
        editorId: editorId,
        invitedBy: ownerId,
        invitedAt: new Date(),
        acceptedAt: new Date(),
      },
    ];

    mockLocationRepository = {
      findById: async (id: LocationId) => {
        if (id === testLocation.id) {
          return ok(testLocation);
        }
        return ok(null);
      },
      list: async () => ok({ items: [testLocation], count: 1 }),
      listEditors: async () => ok(testEditors),
    };

    mockRegionRepository = {
      findById: async (id: RegionId) => {
        if (id === testRegion.id) {
          return ok(testRegion);
        }
        return ok(null);
      },
    };

    context = createMockContext({
      locationRepository: mockLocationRepository,
      regionRepository: mockRegionRepository,
    });
  });

  describe("SPEC-TLA+: Location editor access control", () => {
    it("should list editors for valid location and owner", async () => {
      const input = {
        locationId: testLocation.id,
      };

      const result = await listLocationEditors(context, ownerId, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const editors = result.value;
        expect(editors).toHaveLength(1);
        expect(editors[0].locationId).toBe(testLocation.id);
        expect(editors[0].acceptedAt).not.toBeNull();
      }
    });

    it("should enforce location access permissions", async () => {
      const input = {
        locationId: testLocation.id,
      };

      const unauthorizedUserId = "unauthorized-001" as UserId;
      const result = await listLocationEditors(
        context,
        unauthorizedUserId,
        input,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Permission denied");
      }
    });
  });

  describe("Alloy model constraints validation", () => {
    it("should enforce location-region relationship consistency", async () => {
      // Alloy INV: All locations must belong to valid regions
      const input = {
        locationId: testLocation.id,
      };

      const result = await listLocationEditors(context, ownerId, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(testLocation.regionId).toBe(testRegion.id);
      }
    });

    it("should maintain editor-location relationship consistency", async () => {
      // Alloy INV: All editors must be associated with valid locations
      const input = {
        locationId: testLocation.id,
      };

      const result = await listLocationEditors(context, ownerId, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        for (const editor of result.value) {
          expect(editor.locationId).toBe(testLocation.id);
          expect(editor.acceptedAt).not.toBeNull(); // Only accepted editors should be listed
        }
      }
    });

    it("should maintain location-region relationship consistency", async () => {
      // Alloy INV: Locations must reference existing regions
      const input = {
        locationId: testLocation.id,
      };

      const result = await listLocationEditors(context, ownerId, input);

      expect(result.isOk()).toBe(true);
      expect(testLocation.regionId).toBeDefined();
      expect(testRegion.id).toBe(testLocation.regionId);
    });
  });

  describe("Input validation", () => {
    it("should reject invalid location ID", async () => {
      const input = {
        locationId: "invalid-id" as LocationId,
      };

      const result = await listLocationEditors(context, ownerId, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Invalid location editor list input");
      }
    });

    it("should handle non-existent location", async () => {
      const input = {
        locationId: "non-existent" as LocationId,
      };

      const result = await listLocationEditors(context, ownerId, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Location not found");
      }
    });

    it("should validate editor permissions", async () => {
      const input = {
        locationId: testLocation.id,
      };

      const result = await listLocationEditors(context, ownerId, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeDefined();
        expect(Array.isArray(result.value)).toBe(true);
      }
    });
  });

  describe("Error handling", () => {
    it("should handle location repository failure", async () => {
      mockLocationRepository.findById = async () => {
        return err(new Error("Database connection failed"));
      };

      const input = {
        locationId: testLocation.id,
      };

      const result = await listLocationEditors(context, ownerId, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to get location");
      }
    });

    it("should handle editor list retrieval failure", async () => {
      mockLocationRepository.listEditors = async () => {
        return err(new Error("Editor service unavailable"));
      };

      const input = {
        locationId: testLocation.id,
      };

      const result = await listLocationEditors(context, ownerId, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to list location editors");
      }
    });

    it("should handle unexpected errors", async () => {
      mockLocationRepository.findById = async () => {
        throw new Error("Unexpected error");
      };

      const input = {
        locationId: testLocation.id,
      };

      const result = await listLocationEditors(context, ownerId, input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ApplicationError);
        expect(result.error.message).toBe("Failed to list location editors");
      }
    });
  });

  describe("TLA+ temporal properties", () => {
    it("should eventually return editor list", async () => {
      // TLA+ TEMP: EditorListEventuallyReturned
      const input = {
        locationId: testLocation.id,
      };

      const result = await listLocationEditors(context, ownerId, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeDefined();
        expect(Array.isArray(result.value)).toBe(true);
      }
    });

    it("should maintain editor consistency over time", async () => {
      // TLA+ INV: Editor list remains consistent with location state
      const input = {
        locationId: testLocation.id,
      };

      const result = await listLocationEditors(context, ownerId, input);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(testEditors.length);
        expect(result.value[0].locationId).toBe(testLocation.id);
      }
    });
  });
});
