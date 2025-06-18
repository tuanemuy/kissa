import type { Result } from "neverthrow";

export interface GeocodeResult {
  address: string;
  latitude: number;
  longitude: number;
  placeId?: string;
}

export interface ReverseGeocodeResult {
  address: string;
  placeId?: string;
}

export interface MapsService {
  /**
   * Geocode an address to get coordinates
   */
  geocode(address: string): Promise<Result<GeocodeResult, Error>>;

  /**
   * Reverse geocode coordinates to get address
   */
  reverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<Result<ReverseGeocodeResult, Error>>;

  /**
   * Validate coordinates
   */
  validateCoordinates(latitude: number, longitude: number): boolean;
}
