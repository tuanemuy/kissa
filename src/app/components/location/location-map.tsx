"use client";

import { Map as MapComponent } from "@/components/ui/map";
import { MapMarker } from "@/components/ui/map-marker";
import type { Location } from "@/core/domain/location/types";
import { MapPin } from "lucide-react";
import { useMemo } from "react";

export interface LocationMapProps {
  locations: Location[];
  selectedLocationId?: string;
  onLocationClick?: (location: Location) => void;
  height?: string;
  className?: string;
}

export function LocationMap({
  locations,
  selectedLocationId,
  onLocationClick,
  height = "400px",
  className,
}: LocationMapProps) {
  const mapCenter = useMemo(() => {
    if (locations.length === 0) {
      return { lat: 35.6762, lng: 139.6503 }; // Tokyo default
    }

    if (locations.length === 1) {
      const location = locations[0];
      if (location.latitude !== null && location.longitude !== null) {
        return { lat: location.latitude, lng: location.longitude };
      }
      return { lat: 35.6762, lng: 139.6503 };
    }

    // Filter out locations with null coordinates
    const validLocations = locations.filter(
      (loc) => loc.latitude !== null && loc.longitude !== null,
    );

    if (validLocations.length === 0) {
      return { lat: 35.6762, lng: 139.6503 };
    }

    // Calculate center of all valid locations
    const totalLat = validLocations.reduce(
      (sum, loc) => sum + (loc.latitude ?? 0),
      0,
    );
    const totalLng = validLocations.reduce(
      (sum, loc) => sum + (loc.longitude ?? 0),
      0,
    );

    return {
      lat: totalLat / validLocations.length,
      lng: totalLng / validLocations.length,
    };
  }, [locations]);

  const mapZoom = useMemo(() => {
    if (locations.length === 0) return 10;
    if (locations.length === 1) return 15;

    // Filter out locations with null coordinates
    const validLocations = locations.filter(
      (loc) => loc.latitude !== null && loc.longitude !== null,
    );

    if (validLocations.length === 0) return 10;

    // Calculate appropriate zoom level based on bounds
    const latitudes = validLocations.map((loc) => loc.latitude ?? 0);
    const longitudes = validLocations.map((loc) => loc.longitude ?? 0);

    const latRange = Math.max(...latitudes) - Math.min(...latitudes);
    const lngRange = Math.max(...longitudes) - Math.min(...longitudes);
    const maxRange = Math.max(latRange, lngRange);

    if (maxRange > 10) return 6;
    if (maxRange > 5) return 8;
    if (maxRange > 1) return 10;
    if (maxRange > 0.5) return 12;
    return 14;
  }, [locations]);

  const handleMapReady = (map: google.maps.Map) => {
    // Fit bounds to show all locations if there are multiple
    const validLocations = locations.filter(
      (loc) => loc.latitude !== null && loc.longitude !== null,
    );

    if (validLocations.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      for (const location of validLocations) {
        bounds.extend({
          lat: location.latitude ?? 0,
          lng: location.longitude ?? 0,
        });
      }
      map.fitBounds(bounds);
    }
  };

  return (
    <MapComponent
      center={mapCenter}
      zoom={mapZoom}
      height={height}
      className={className}
      onMapReady={(map) => {
        handleMapReady(map);

        // Add markers to map
        const validLocationsList = locations.filter(
          (loc) => loc.latitude !== null && loc.longitude !== null,
        );

        for (const location of validLocationsList) {
          const markerContent = `
              <div class="p-3 max-w-xs">
                <h3 class="font-semibold text-lg mb-2">${location.name}</h3>
                ${location.description ? `<p class="text-sm text-gray-600 mb-2">${location.description}</p>` : ""}
                <div class="text-xs text-gray-500">
                  <p>カテゴリ: ${location.category}</p>
                  ${location.address ? `<p>住所: ${location.address}</p>` : ""}
                </div>
              </div>
            `;

          const marker = new google.maps.Marker({
            position: {
              lat: location.latitude ?? 0,
              lng: location.longitude ?? 0,
            },
            map,
            title: location.name,
            icon:
              location.id === selectedLocationId
                ? "/icons/map-pin-selected.svg"
                : "/icons/map-pin.svg",
          });

          const infoWindow = new google.maps.InfoWindow({
            content: markerContent,
          });

          marker.addListener("click", () => {
            infoWindow.open(map, marker);
            onLocationClick?.(location);
          });
        }
      }}
    />
  );
}

interface LocationMapMarkerProps {
  location: Location;
  isSelected: boolean;
  onClick: () => void;
}

function LocationMapMarker({
  location,
  isSelected,
  onClick,
}: LocationMapMarkerProps) {
  const markerContent = `
    <div class="p-3 max-w-xs">
      <h3 class="font-semibold text-lg mb-2">${location.name}</h3>
      ${location.description ? `<p class="text-sm text-gray-600 mb-2">${location.description}</p>` : ""}
      <div class="text-xs text-gray-500">
        <p>カテゴリ: ${location.category}</p>
        ${location.address ? `<p>住所: ${location.address}</p>` : ""}
      </div>
    </div>
  `;

  if (location.latitude === null || location.longitude === null) {
    return null;
  }

  // This component is not used as the markers are created directly in the map
  return null;
}
