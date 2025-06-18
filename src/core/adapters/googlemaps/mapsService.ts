import { Client } from "@googlemaps/google-maps-services-js";
import { type Result, err, ok } from "neverthrow";
import type {
  GeocodeResult,
  MapsService,
  ReverseGeocodeResult,
} from "../../domain/common/ports/mapsService";

export interface GoogleMapsConfig {
  apiKey: string;
}

export class GoogleMapsService implements MapsService {
  private client: Client;
  private apiKey: string;

  constructor(config: GoogleMapsConfig) {
    this.apiKey = config.apiKey;
    this.client = new Client({});
  }

  async geocode(address: string): Promise<Result<GeocodeResult, Error>> {
    try {
      const response = await this.client.geocode({
        params: {
          address,
          key: this.apiKey,
        },
      });

      if (response.data.status !== "OK" || response.data.results.length === 0) {
        return err(new Error(`Geocoding failed: ${response.data.status}`));
      }

      const result = response.data.results[0];
      const location = result.geometry.location;

      return ok({
        address: result.formatted_address,
        latitude: location.lat,
        longitude: location.lng,
        placeId: result.place_id,
      });
    } catch (error) {
      return err(new Error(`Google Maps geocoding error: ${error}`));
    }
  }

  async reverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<Result<ReverseGeocodeResult, Error>> {
    try {
      if (!this.validateCoordinates(latitude, longitude)) {
        return err(new Error("Invalid coordinates"));
      }

      const response = await this.client.reverseGeocode({
        params: {
          latlng: { lat: latitude, lng: longitude },
          key: this.apiKey,
        },
      });

      if (response.data.status !== "OK" || response.data.results.length === 0) {
        return err(
          new Error(`Reverse geocoding failed: ${response.data.status}`),
        );
      }

      const result = response.data.results[0];

      return ok({
        address: result.formatted_address,
        placeId: result.place_id,
      });
    } catch (error) {
      return err(new Error(`Google Maps reverse geocoding error: ${error}`));
    }
  }

  validateCoordinates(latitude: number, longitude: number): boolean {
    return (
      typeof latitude === "number" &&
      typeof longitude === "number" &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180 &&
      !Number.isNaN(latitude) &&
      !Number.isNaN(longitude)
    );
  }
}
