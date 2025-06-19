import type { RepositoryError } from "@/lib/error";
import { RepositoryError as RepositoryErrorClass } from "@/lib/error";
import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";
import type { LocationRepository } from "../../domain/location/ports/locationRepository";
import type {
  CreateLocationParams,
  InviteLocationEditorParams,
  ListLocationsQuery,
  Location,
  LocationEditor,
  LocationEditorId,
  LocationId,
  LocationWithEditors,
  LocationWithStats,
  UpdateLocationParams,
} from "../../domain/location/types";
import type { RegionId } from "../../domain/region/types";
import type { UserId } from "../../domain/user/types";

export class MockLocationRepository implements LocationRepository {
  private locations = new Map<LocationId, Location>();
  private locationEditors = new Map<LocationEditorId, LocationEditor>();
  private shouldFailOperations = false;

  setShouldFailOperations(shouldFail: boolean): void {
    this.shouldFailOperations = shouldFail;
  }

  addLocation(location: Location): void {
    this.locations.set(location.id, location);
  }

  addLocationEditor(locationEditor: LocationEditor): void {
    this.locationEditors.set(locationEditor.id, locationEditor);
  }

  clear(): void {
    this.locations.clear();
    this.locationEditors.clear();
  }

  async create(
    params: CreateLocationParams,
  ): Promise<Result<Location, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock create failure"));
    }

    const location: Location = {
      id: `location-${Date.now()}` as LocationId,
      regionId: params.regionId,
      name: params.name,
      description: params.description ?? null,
      category: params.category ?? null,
      address: params.address ?? null,
      latitude: params.latitude ?? null,
      longitude: params.longitude ?? null,
      contactInfo: params.contactInfo ?? null,
      operatingHours: params.operatingHours ?? null,
      isPublic: params.isPublic ?? false,
      coverPhotoUrl: params.coverPhotoUrl ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.locations.set(location.id, location);
    return ok(location);
  }

  async findById(
    id: LocationId,
  ): Promise<Result<Location | null, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock findById failure"));
    }

    return ok(this.locations.get(id) ?? null);
  }

  async findByIdWithStats(
    id: LocationId,
  ): Promise<Result<LocationWithStats | null, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock findByIdWithStats failure"));
    }

    const location = this.locations.get(id);
    if (!location) {
      return ok(null);
    }

    const locationWithStats: LocationWithStats = {
      ...location,
      favoriteCount: 0,
      checkInCount: 0,
      averageRating: null,
    };

    return ok(locationWithStats);
  }

  async findByIdWithEditors(
    id: LocationId,
  ): Promise<Result<LocationWithEditors | null, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock findByIdWithEditors failure"));
    }

    const location = this.locations.get(id);
    if (!location) {
      return ok(null);
    }

    const editors = Array.from(this.locationEditors.values()).filter(
      (editor) => editor.locationId === id,
    );

    const locationWithEditors: LocationWithEditors = {
      ...location,
      editors,
    };

    return ok(locationWithEditors);
  }

  async update(
    params: UpdateLocationParams,
  ): Promise<Result<Location, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock update failure"));
    }

    const location = this.locations.get(params.id);
    if (!location) {
      return err(new RepositoryErrorClass("Location not found"));
    }

    const updatedLocation: Location = {
      ...location,
      ...(params.name && { name: params.name }),
      ...(params.description !== undefined && {
        description: params.description,
      }),
      ...(params.category !== undefined && { category: params.category }),
      ...(params.address !== undefined && { address: params.address }),
      ...(params.latitude !== undefined && { latitude: params.latitude }),
      ...(params.longitude !== undefined && { longitude: params.longitude }),
      ...(params.contactInfo !== undefined && {
        contactInfo: params.contactInfo,
      }),
      ...(params.operatingHours !== undefined && {
        operatingHours: params.operatingHours,
      }),
      ...(params.isPublic !== undefined && { isPublic: params.isPublic }),
      ...(params.coverPhotoUrl !== undefined && {
        coverPhotoUrl: params.coverPhotoUrl,
      }),
      updatedAt: new Date(),
    };

    this.locations.set(params.id, updatedLocation);
    return ok(updatedLocation);
  }

  async delete(id: LocationId): Promise<Result<void, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock delete failure"));
    }

    if (!this.locations.has(id)) {
      return err(new RepositoryErrorClass("Location not found"));
    }

    this.locations.delete(id);

    // Also delete all location editors for this location
    for (const [editorId, editor] of this.locationEditors.entries()) {
      if (editor.locationId === id) {
        this.locationEditors.delete(editorId);
      }
    }

    return ok(undefined);
  }

  async list(
    query: ListLocationsQuery,
  ): Promise<Result<{ items: Location[]; count: number }, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock list failure"));
    }

    let filteredLocations = Array.from(this.locations.values());

    // Apply filters
    if (query.filter) {
      if (query.filter.regionId) {
        filteredLocations = filteredLocations.filter(
          (location) => location.regionId === query.filter?.regionId,
        );
      }
      if (query.filter.isPublic !== undefined) {
        filteredLocations = filteredLocations.filter(
          (location) => location.isPublic === query.filter?.isPublic,
        );
      }
      if (query.filter.category) {
        filteredLocations = filteredLocations.filter(
          (location) => location.category === query.filter?.category,
        );
      }
      if (query.filter.search) {
        const searchTerm = query.filter.search.toLowerCase();
        filteredLocations = filteredLocations.filter(
          (location) =>
            location.name.toLowerCase().includes(searchTerm) ||
            location.description?.toLowerCase().includes(searchTerm) ||
            location.address?.toLowerCase().includes(searchTerm),
        );
      }
      // Note: nearbyCoordinates filtering would require distance calculation in a real implementation
    }

    // Apply sorting
    if (query.sort) {
      filteredLocations.sort((a, b) => {
        const field = query.sort?.field;
        const order = query.sort?.order;

        let aVal: Date | string;
        let bVal: Date | string;

        switch (field) {
          case "createdAt":
            aVal = a.createdAt;
            bVal = b.createdAt;
            break;
          case "updatedAt":
            aVal = a.updatedAt;
            bVal = b.updatedAt;
            break;
          case "name":
            aVal = a.name;
            bVal = b.name;
            break;
          default:
            aVal = a.createdAt;
            bVal = b.createdAt;
            break;
        }

        if (aVal < bVal) return order === "asc" ? -1 : 1;
        if (aVal > bVal) return order === "asc" ? 1 : -1;
        return 0;
      });
    }

    const totalCount = filteredLocations.length;

    // Apply pagination
    const offset = (query.pagination.page - 1) * query.pagination.limit;
    const paginatedLocations = filteredLocations.slice(
      offset,
      offset + query.pagination.limit,
    );

    return ok({ items: paginatedLocations, count: totalCount });
  }

  async listWithStats(
    query: ListLocationsQuery,
  ): Promise<
    Result<{ items: LocationWithStats[]; count: number }, RepositoryError>
  > {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock listWithStats failure"));
    }

    const listResult = await this.list(query);
    if (listResult.isErr()) {
      return err(listResult.error);
    }

    const { items, count } = listResult.value;
    const itemsWithStats: LocationWithStats[] = items.map((location) => ({
      ...location,
      favoriteCount: 0,
      checkInCount: 0,
      averageRating: null,
    }));

    return ok({ items: itemsWithStats, count });
  }

  async countByRegion(
    regionId: RegionId,
  ): Promise<Result<number, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock countByRegion failure"));
    }

    let count = 0;
    for (const location of this.locations.values()) {
      if (location.regionId === regionId) {
        count++;
      }
    }

    return ok(count);
  }

  async inviteEditor(
    params: InviteLocationEditorParams & { editorId: UserId },
  ): Promise<Result<LocationEditor, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock inviteEditor failure"));
    }

    if (!this.locations.has(params.locationId)) {
      return err(new RepositoryErrorClass("Location not found"));
    }

    const locationEditor: LocationEditor = {
      id: `editor-${Date.now()}` as LocationEditorId,
      locationId: params.locationId,
      editorId: params.editorId,
      invitedBy: params.invitedBy,
      invitedAt: new Date(),
      acceptedAt: null,
    };

    this.locationEditors.set(locationEditor.id, locationEditor);
    return ok(locationEditor);
  }

  async acceptInvitation(
    id: LocationEditorId,
  ): Promise<Result<LocationEditor, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock acceptInvitation failure"));
    }

    const locationEditor = this.locationEditors.get(id);
    if (!locationEditor) {
      return err(
        new RepositoryErrorClass("Location editor invitation not found"),
      );
    }

    const updatedLocationEditor: LocationEditor = {
      ...locationEditor,
      acceptedAt: new Date(),
    };

    this.locationEditors.set(id, updatedLocationEditor);
    return ok(updatedLocationEditor);
  }

  async removeEditor(
    locationId: LocationId,
    editorId: UserId,
  ): Promise<Result<void, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock removeEditor failure"));
    }

    for (const [id, editor] of this.locationEditors.entries()) {
      if (editor.locationId === locationId && editor.editorId === editorId) {
        this.locationEditors.delete(id);
        return ok(undefined);
      }
    }

    return err(new RepositoryErrorClass("Location editor not found"));
  }

  async findEditorsByLocation(
    locationId: LocationId,
  ): Promise<Result<LocationEditor[], RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(
        new RepositoryErrorClass("Mock findEditorsByLocation failure"),
      );
    }

    const editors = Array.from(this.locationEditors.values()).filter(
      (editor) => editor.locationId === locationId,
    );

    return ok(editors);
  }

  async findEditorsByUser(
    userId: UserId,
  ): Promise<Result<LocationEditor[], RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock findEditorsByUser failure"));
    }

    const editors = Array.from(this.locationEditors.values()).filter(
      (editor) => editor.editorId === userId,
    );

    return ok(editors);
  }

  async isUserEditor(
    locationId: LocationId,
    userId: UserId,
  ): Promise<Result<boolean, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock isUserEditor failure"));
    }

    for (const editor of this.locationEditors.values()) {
      if (
        editor.locationId === locationId &&
        editor.editorId === userId &&
        editor.acceptedAt !== null
      ) {
        return ok(true);
      }
    }

    return ok(false);
  }

  async makePublic(id: LocationId): Promise<Result<void, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock makePublic failure"));
    }

    const location = this.locations.get(id);
    if (!location) {
      return err(new RepositoryErrorClass("Location not found"));
    }

    const updatedLocation: Location = {
      ...location,
      isPublic: true,
      updatedAt: new Date(),
    };

    this.locations.set(id, updatedLocation);
    return ok(undefined);
  }

  async makePrivate(id: LocationId): Promise<Result<void, RepositoryError>> {
    if (this.shouldFailOperations) {
      return err(new RepositoryErrorClass("Mock makePrivate failure"));
    }

    const location = this.locations.get(id);
    if (!location) {
      return err(new RepositoryErrorClass("Location not found"));
    }

    const updatedLocation: Location = {
      ...location,
      isPublic: false,
      updatedAt: new Date(),
    };

    this.locations.set(id, updatedLocation);
    return ok(undefined);
  }
}
