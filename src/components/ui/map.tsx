"use client";

import { Loader } from "@googlemaps/js-api-loader";
import { useEffect, useRef, useState } from "react";

export interface MapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  className?: string;
  onMapReady?: (map: google.maps.Map) => void;
  onClick?: (event: google.maps.MapMouseEvent) => void;
}

export function Map({
  center = { lat: 35.6762, lng: 139.6503 }, // Tokyo default
  zoom = 10,
  height = "400px",
  className = "",
  onMapReady,
  onClick,
}: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
      version: "weekly",
      libraries: ["places"],
    });

    loader
      .load()
      .then(() => {
        const mapInstance = new google.maps.Map(mapRef.current!, {
          center,
          zoom,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        setMap(mapInstance);
        setLoading(false);
        onMapReady?.(mapInstance);

        if (onClick) {
          mapInstance.addListener("click", onClick);
        }
      })
      .catch((err) => {
        console.error("Failed to load Google Maps:", err);
        setError("マップの読み込みに失敗しました");
        setLoading(false);
      });
  }, [center.lat, center.lng, zoom, onMapReady, onClick]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-muted rounded-lg ${className}`}
        style={{ height }}
      >
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
          <p className="text-muted-foreground">マップを読み込み中...</p>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full rounded-lg" />
    </div>
  );
}
