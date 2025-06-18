"use client";

import {
  discoverLocationsAction,
  getPublicRegionWithStatusAction,
} from "@/actions/browsing";
import { FavoriteButton } from "@/app/components/favorite/FavoriteButton";
import { PinButton } from "@/app/components/favorite/PinButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LocationWithStats } from "@/core/domain/location/types";
import type { RegionWithStats } from "@/core/domain/region/types";
import { ArrowLeft, Calendar, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function DiscoverRegionPage() {
  const params = useParams();
  const regionId = params.id as string;

  const [region, setRegion] = useState<
    (RegionWithStats & { isFavorited: boolean; isPinned: boolean }) | null
  >(null);
  const [locations, setLocations] = useState<LocationWithStats[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const loadRegion = useCallback(async () => {
    try {
      const result = await getPublicRegionWithStatusAction(regionId);
      setRegion(result);
    } catch (error) {
      console.error("Failed to load region:", error);
    } finally {
      setLoading(false);
    }
  }, [regionId]);

  const loadLocations = useCallback(
    async (page = 1) => {
      try {
        setLoadingLocations(true);
        const result = await discoverLocationsAction({
          pagination: { page, limit: 12 },
          filter: { regionId },
          sort: { field: "createdAt", order: "desc" },
        });

        if (page === 1) {
          setLocations(result.items);
        } else {
          setLocations((prev) => [...prev, ...result.items]);
        }
        setTotalCount(result.count);
        setCurrentPage(page);
      } catch (error) {
        console.error("Failed to load locations:", error);
      } finally {
        setLoadingLocations(false);
      }
    },
    [regionId],
  );

  useEffect(() => {
    loadRegion();
    loadLocations();
  }, [loadRegion, loadLocations]);

  const handleLoadMore = () => {
    if (!loadingLocations) {
      loadLocations(currentPage + 1);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <div className="text-muted-foreground">Loading region...</div>
        </div>
      </div>
    );
  }

  if (!region) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            Region not found or not public.
          </div>
          <Button asChild className="mt-4">
            <Link href="/discover">Back to Discovery</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/discover">
              <ArrowLeft className="h-4 w-4" />
              Back to Discovery
            </Link>
          </Button>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">{region.name}</h1>
            <div className="flex items-center gap-3">
              <FavoriteButton
                targetId={region.id}
                targetType="region"
                isFavorited={region.isFavorited}
              />
              <PinButton regionId={region.id} isPinned={region.isPinned} />
              <Badge variant="secondary">
                {region.locationCount} location
                {region.locationCount !== 1 ? "s" : ""}
              </Badge>
            </div>
          </div>

          {region.description && (
            <p className="text-muted-foreground mb-4">{region.description}</p>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-1" />
              {region.latitude}, {region.longitude}
            </div>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              Created {new Date(region.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">
            Locations in this Region
          </h2>

          {loadingLocations && locations.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">Loading locations...</div>
            </div>
          ) : locations.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">
                No public locations in this region yet.
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {locations.map((location) => (
                  <Card
                    key={location.id}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          {location.name}
                        </CardTitle>
                        {location.category && (
                          <Badge variant="outline">{location.category}</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                        {location.description || "No description available."}
                      </p>

                      {location.address && (
                        <div className="flex items-center text-sm text-muted-foreground mb-2">
                          <MapPin className="h-4 w-4 mr-1" />
                          {location.address}
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/discover/locations/${location.id}`}>
                            View Details
                          </Link>
                        </Button>
                        <div className="text-xs text-muted-foreground flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {location.checkInCount} check-in
                          {location.checkInCount !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {locations.length < totalCount && (
                <div className="text-center">
                  <Button
                    onClick={handleLoadMore}
                    disabled={loadingLocations}
                    variant="outline"
                  >
                    {loadingLocations ? "Loading..." : "Load More"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
