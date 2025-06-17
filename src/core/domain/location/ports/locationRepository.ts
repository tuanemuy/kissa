import type { RepositoryError } from "@/lib/error";
import type { Result } from "neverthrow";
import type { RegionId } from "../../region/types";
import type { UserId } from "../../user/types";
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
} from "../types";

export interface LocationRepository {
  // Location operations
  create(
    params: CreateLocationParams,
  ): Promise<Result<Location, RepositoryError>>;
  findById(id: LocationId): Promise<Result<Location | null, RepositoryError>>;
  findByIdWithStats(
    id: LocationId,
  ): Promise<Result<LocationWithStats | null, RepositoryError>>;
  findByIdWithEditors(
    id: LocationId,
  ): Promise<Result<LocationWithEditors | null, RepositoryError>>;
  update(
    params: UpdateLocationParams,
  ): Promise<Result<Location, RepositoryError>>;
  delete(id: LocationId): Promise<Result<void, RepositoryError>>;
  list(
    query: ListLocationsQuery,
  ): Promise<Result<{ items: Location[]; count: number }, RepositoryError>>;
  listWithStats(
    query: ListLocationsQuery,
  ): Promise<
    Result<{ items: LocationWithStats[]; count: number }, RepositoryError>
  >;
  countByRegion(regionId: RegionId): Promise<Result<number, RepositoryError>>;

  // Editor operations
  inviteEditor(
    params: InviteLocationEditorParams & { editorId: UserId },
  ): Promise<Result<LocationEditor, RepositoryError>>;
  acceptInvitation(
    id: LocationEditorId,
  ): Promise<Result<LocationEditor, RepositoryError>>;
  removeEditor(
    locationId: LocationId,
    editorId: UserId,
  ): Promise<Result<void, RepositoryError>>;
  findEditorsByLocation(
    locationId: LocationId,
  ): Promise<Result<LocationEditor[], RepositoryError>>;
  findEditorsByUser(
    userId: UserId,
  ): Promise<Result<LocationEditor[], RepositoryError>>;
  isUserEditor(
    locationId: LocationId,
    userId: UserId,
  ): Promise<Result<boolean, RepositoryError>>;

  // Visibility operations
  makePublic(id: LocationId): Promise<Result<void, RepositoryError>>;
  makePrivate(id: LocationId): Promise<Result<void, RepositoryError>>;
}
