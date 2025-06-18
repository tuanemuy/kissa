"use server";

import {
  type DiscoverLocationsInput,
  discoverLocations,
} from "@/core/application/browsing/discoverLocations";
import {
  type DiscoverRegionsInput,
  discoverRegions,
} from "@/core/application/browsing/discoverRegions";
import type {
  LocationId,
  LocationWithStats,
} from "@/core/domain/location/types";
import { locationIdSchema } from "@/core/domain/location/types";
import type { RegionId, RegionWithStats } from "@/core/domain/region/types";
import { regionIdSchema } from "@/core/domain/region/types";
import { getContext } from "./context";

export async function discoverRegionsAction(
  input: DiscoverRegionsInput,
): Promise<{ items: RegionWithStats[]; count: number }> {
  const context = getContext();
  const result = await discoverRegions(context, input);

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  return result.value;
}

export async function discoverLocationsAction(
  input: DiscoverLocationsInput,
): Promise<{ items: LocationWithStats[]; count: number }> {
  const context = getContext();
  const result = await discoverLocations(context, input);

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  return result.value;
}

export async function searchRegionsAction(
  searchTerm: string,
  page = 1,
  limit = 12,
): Promise<{ items: RegionWithStats[]; count: number }> {
  return discoverRegionsAction({
    pagination: { page, limit },
    filter: { search: searchTerm },
    sort: { field: "name", order: "asc" },
  });
}

export async function searchLocationsAction(
  searchTerm: string,
  regionId?: string,
  page = 1,
  limit = 12,
): Promise<{ items: LocationWithStats[]; count: number }> {
  return discoverLocationsAction({
    pagination: { page, limit },
    filter: { search: searchTerm, regionId },
    sort: { field: "name", order: "asc" },
  });
}

export async function getPublicRegionAction(
  regionId: string,
): Promise<RegionWithStats> {
  const validatedRegionId = regionIdSchema.safeParse(regionId);
  if (!validatedRegionId.success) {
    throw new Error("Invalid region ID");
  }

  const context = getContext();
  const result = await context.regionRepository.findByIdWithStats(
    validatedRegionId.data,
  );

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  if (!result.value) {
    throw new Error("Region not found");
  }

  if (!result.value.isPublic) {
    throw new Error("Region is not public");
  }

  return result.value;
}

export async function getPublicLocationAction(
  locationId: string,
): Promise<LocationWithStats> {
  const validatedLocationId = locationIdSchema.safeParse(locationId);
  if (!validatedLocationId.success) {
    throw new Error("Invalid location ID");
  }

  const context = getContext();
  const result = await context.locationRepository.findByIdWithStats(
    validatedLocationId.data,
  );

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  if (!result.value) {
    throw new Error("Location not found");
  }

  if (!result.value.isPublic) {
    throw new Error("Location is not public");
  }

  return result.value;
}

export async function getPublicRegionWithStatusAction(
  regionId: string,
): Promise<RegionWithStats & { isFavorited: boolean; isPinned: boolean }> {
  const validatedRegionId = regionIdSchema.safeParse(regionId);
  if (!validatedRegionId.success) {
    throw new Error("Invalid region ID");
  }

  const context = getContext();
  const result = await context.regionRepository.findByIdWithStats(
    validatedRegionId.data,
  );

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  if (!result.value) {
    throw new Error("Region not found");
  }

  if (!result.value.isPublic) {
    throw new Error("Region is not public");
  }

  const region = result.value;

  // Check if user is authenticated and get favorite/pin status
  const userIdResult = await context.authService.getCurrentUserId();
  if (userIdResult.isErr() || !userIdResult.value) {
    // User not authenticated, return region without status
    return {
      ...region,
      isFavorited: false,
      isPinned: false,
    };
  }

  const userId = userIdResult.value;

  // Get favorite and pin status in parallel
  const [favoriteResult, pinResult] = await Promise.all([
    context.favoriteRepository.isFavorited(userId, regionId as RegionId),
    context.favoriteRepository.isPinned(userId, regionId as RegionId),
  ]);

  return {
    ...region,
    isFavorited: favoriteResult.isOk() ? favoriteResult.value : false,
    isPinned: pinResult.isOk() ? pinResult.value : false,
  };
}

export async function getPublicLocationWithStatusAction(
  locationId: string,
): Promise<LocationWithStats & { isFavorited: boolean }> {
  const validatedLocationId = locationIdSchema.safeParse(locationId);
  if (!validatedLocationId.success) {
    throw new Error("Invalid location ID");
  }

  const context = getContext();
  const result = await context.locationRepository.findByIdWithStats(
    validatedLocationId.data,
  );

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  if (!result.value) {
    throw new Error("Location not found");
  }

  if (!result.value.isPublic) {
    throw new Error("Location is not public");
  }

  const location = result.value;

  // Check if user is authenticated and get favorite status
  const userIdResult = await context.authService.getCurrentUserId();
  if (userIdResult.isErr() || !userIdResult.value) {
    // User not authenticated, return location without status
    return {
      ...location,
      isFavorited: false,
    };
  }

  const userId = userIdResult.value;

  // Get favorite status
  const favoriteResult = await context.favoriteRepository.isFavorited(
    userId,
    undefined,
    locationId as LocationId,
  );

  return {
    ...location,
    isFavorited: favoriteResult.isOk() ? favoriteResult.value : false,
  };
}
