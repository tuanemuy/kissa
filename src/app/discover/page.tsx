"use client";

import { discoverRegionsAction, searchRegionsAction } from "@/actions/browsing";
import { AdvancedSearch } from "@/components/ui/advanced-search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { RegionWithStats } from "@/core/domain/region/types";
import { MapPin, Search, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function DiscoverPage() {
  const [regions, setRegions] = useState<RegionWithStats[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearching, setIsSearching] = useState(false);

  const loadRegions = useCallback(async (search?: string, page = 1) => {
    try {
      setLoading(true);
      let result: { items: RegionWithStats[]; count: number };

      if (search?.trim()) {
        result = await searchRegionsAction(search, page, 12);
      } else {
        result = await discoverRegionsAction({
          pagination: { page, limit: 12 },
          sort: { field: "createdAt", order: "desc" },
        });
      }

      setRegions(result.items);
      setTotalCount(result.count);
      setCurrentPage(page);
    } catch (error) {
      console.error("Failed to load regions:", error);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    loadRegions();
  }, [loadRegions]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    await loadRegions(searchTerm, 1);
  };

  const handleLoadMore = () => {
    if (!loading) {
      loadRegions(searchTerm || undefined, currentPage + 1);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">地域を発見</h1>
          <p className="text-lg text-muted-foreground mb-6">
            コミュニティが作成した地域と場所を探索してみてください
          </p>

          <div className="max-w-2xl mx-auto">
            <AdvancedSearch type="regions" />
          </div>
        </div>

        {loading && regions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-muted-foreground">Loading regions...</div>
          </div>
        ) : regions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-muted-foreground">
              {searchTerm
                ? "No regions found for your search."
                : "No public regions available yet."}
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-sm text-muted-foreground">
                Found {totalCount} region{totalCount !== 1 ? "s" : ""}
                {searchTerm && ` for "${searchTerm}"`}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {regions.map((region) => (
                <Card
                  key={region.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{region.name}</CardTitle>
                      <Badge variant="secondary">
                        <Users className="h-3 w-3 mr-1" />
                        {region.locationCount}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {region.description || "No description available."}
                    </p>

                    <div className="flex items-center text-sm text-muted-foreground mb-4">
                      <MapPin className="h-4 w-4 mr-1" />
                      {region.latitude}, {region.longitude}
                    </div>

                    <div className="flex justify-between items-center">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/discover/regions/${region.id}`}>
                          Explore
                        </Link>
                      </Button>
                      <div className="text-xs text-muted-foreground">
                        {region.locationCount} location
                        {region.locationCount !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {regions.length < totalCount && (
              <div className="text-center">
                <Button
                  onClick={handleLoadMore}
                  disabled={loading}
                  variant="outline"
                >
                  {loading ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
