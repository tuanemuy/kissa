"use client";

import { MapPin, Search } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Input } from "./input";
import { Label } from "./label";
import { Map } from "./map";
import { MapMarker } from "./map-marker";

export interface LocationPickerProps {
  initialLocation?: { lat: number; lng: number };
  onLocationChange?: (location: { lat: number; lng: number }) => void;
  onAddressChange?: (address: string) => void;
  disabled?: boolean;
}

export function LocationPicker({
  initialLocation,
  onLocationChange,
  onAddressChange,
  disabled = false,
}: LocationPickerProps) {
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(initialLocation || null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [address, setAddress] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleMapReady = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    setGeocoder(new google.maps.Geocoder());
  }, []);

  const handleMapClick = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (disabled || !event.latLng) return;

      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      const location = { lat, lng };

      setSelectedLocation(location);
      onLocationChange?.(location);

      // Reverse geocode to get address
      if (geocoder) {
        geocoder.geocode({ location }, (results, status) => {
          if (status === "OK" && results?.[0]) {
            const newAddress = results[0].formatted_address;
            setAddress(newAddress);
            onAddressChange?.(newAddress);
          }
        });
      }
    },
    [disabled, onLocationChange, onAddressChange, geocoder],
  );

  const handleSearch = useCallback(async () => {
    if (!geocoder || !searchQuery.trim() || isSearching) return;

    setIsSearching(true);
    try {
      geocoder.geocode({ address: searchQuery }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          const location = results[0].geometry.location;
          const lat = location.lat();
          const lng = location.lng();
          const newLocation = { lat, lng };

          setSelectedLocation(newLocation);
          onLocationChange?.(newLocation);

          const newAddress = results[0].formatted_address;
          setAddress(newAddress);
          onAddressChange?.(newAddress);

          // Center map on new location
          if (map) {
            map.setCenter(newLocation);
            map.setZoom(15);
          }
        }
        setIsSearching(false);
      });
    } catch (error) {
      console.error("Search failed:", error);
      setIsSearching(false);
    }
  }, [
    geocoder,
    searchQuery,
    onLocationChange,
    onAddressChange,
    map,
    isSearching,
  ]);

  const handleUseCurrentLocation = useCallback(() => {
    if (disabled || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setSelectedLocation(location);
        onLocationChange?.(location);

        if (map) {
          map.setCenter(location);
          map.setZoom(15);
        }

        // Reverse geocode to get address
        if (geocoder) {
          geocoder.geocode({ location }, (results, status) => {
            if (status === "OK" && results?.[0]) {
              const newAddress = results[0].formatted_address;
              setAddress(newAddress);
              onAddressChange?.(newAddress);
            }
          });
        }
      },
      (error) => {
        console.error("Geolocation failed:", error);
      },
    );
  }, [disabled, onLocationChange, onAddressChange, map, geocoder]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          位置を選択
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="location-search">住所を検索</Label>
            <Input
              id="location-search"
              placeholder="住所を入力してください"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              disabled={disabled}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button
              onClick={handleSearch}
              disabled={disabled || isSearching || !searchQuery.trim()}
              size="sm"
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleUseCurrentLocation}
              disabled={disabled}
              variant="outline"
              size="sm"
            >
              現在地
            </Button>
          </div>
        </div>

        {address && (
          <div>
            <Label>選択された住所</Label>
            <p className="text-sm text-muted-foreground">{address}</p>
          </div>
        )}

        <div>
          <Label>マップをクリックして位置を選択</Label>
          <Map
            center={selectedLocation || { lat: 35.6762, lng: 139.6503 }}
            zoom={selectedLocation ? 15 : 10}
            height="300px"
            onMapReady={handleMapReady}
            onClick={handleMapClick}
            className="mt-2"
          />
          {selectedLocation && map && (
            <MapMarker
              map={map}
              position={selectedLocation}
              title="選択された位置"
            />
          )}
        </div>

        {selectedLocation && (
          <div className="text-xs text-muted-foreground">
            座標: {selectedLocation.lat.toFixed(6)},{" "}
            {selectedLocation.lng.toFixed(6)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
