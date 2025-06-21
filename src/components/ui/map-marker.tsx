"use client";

import { useEffect, useState } from "react";

export interface MapMarkerProps {
  map: google.maps.Map;
  position: { lat: number; lng: number };
  title?: string;
  content?: string;
  icon?: string;
  onClick?: () => void;
}

export function MapMarker({
  map,
  position,
  title,
  content,
  icon,
  onClick,
}: MapMarkerProps) {
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const [infoWindow, setInfoWindow] = useState<google.maps.InfoWindow | null>(
    null,
  );

  useEffect(() => {
    if (!map) return;

    const markerInstance = new google.maps.Marker({
      position,
      map,
      title,
      icon: icon
        ? {
            url: icon,
            scaledSize: new google.maps.Size(32, 32),
          }
        : undefined,
    });

    setMarker(markerInstance);

    if (content) {
      const infoWindowInstance = new google.maps.InfoWindow({
        content,
      });
      setInfoWindow(infoWindowInstance);

      markerInstance.addListener("click", () => {
        infoWindowInstance.open(map, markerInstance);
        onClick?.();
      });
    } else if (onClick) {
      markerInstance.addListener("click", onClick);
    }

    return () => {
      markerInstance.setMap(null);
      if (content) {
        const infoWindowInstance = new google.maps.InfoWindow({
          content,
        });
        infoWindowInstance?.close();
      }
    };
  }, [map, position.lat, position.lng, title, content, icon, onClick]);

  return null;
}
