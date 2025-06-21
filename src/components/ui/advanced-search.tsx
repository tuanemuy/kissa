"use client";

import { Calendar, Filter, MapPin, Search, Star, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Badge } from "./badge";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Input } from "./input";
import { Label } from "./label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";
import { Slider } from "./slider";
import { Switch } from "./switch";

export interface AdvancedSearchProps {
  type: "regions" | "locations";
  className?: string;
}

interface SearchFilters {
  query?: string;
  category?: string;
  minRating?: number;
  maxDistance?: number;
  hasImages?: boolean;
  hasContact?: boolean;
  isPublic?: boolean;
  sortBy?: "relevance" | "rating" | "distance" | "recent";
  sortOrder?: "asc" | "desc";
}

const CATEGORIES = {
  locations: [
    "レストラン",
    "カフェ",
    "観光地",
    "ショッピング",
    "公園",
    "文化施設",
    "宿泊施設",
    "交通機関",
    "医療・健康",
    "教育",
    "スポーツ",
    "エンターテイメント",
    "その他",
  ],
  regions: [
    "都市部",
    "郊外",
    "自然",
    "歴史的地区",
    "商業地区",
    "住宅地",
    "観光地",
    "その他",
  ],
};

const SORT_OPTIONS = [
  { value: "relevance", label: "関連度" },
  { value: "rating", label: "評価" },
  { value: "distance", label: "距離" },
  { value: "recent", label: "最新" },
];

export function AdvancedSearch({ type, className = "" }: AdvancedSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  // Initialize filters from URL params
  const [filters, setFilters] = useState<SearchFilters>({
    query: searchParams.get("search") || "",
    category: searchParams.get("category") || "",
    minRating: Number(searchParams.get("minRating")) || 0,
    maxDistance: Number(searchParams.get("maxDistance")) || 50,
    hasImages: searchParams.get("hasImages") === "true",
    hasContact: searchParams.get("hasContact") === "true",
    isPublic: searchParams.get("isPublic") !== "false",
    sortBy:
      (searchParams.get("sortBy") as SearchFilters["sortBy"]) || "relevance",
    sortOrder:
      (searchParams.get("sortOrder") as SearchFilters["sortOrder"]) || "desc",
  });

  const updateFilter = useCallback((key: keyof SearchFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        if (typeof value === "boolean") {
          params.set(key, value.toString());
        } else if (typeof value === "number" && value > 0) {
          params.set(key, value.toString());
        } else if (typeof value === "string" && value.trim() !== "") {
          params.set(key, value);
        }
      }
    });

    const basePath = type === "regions" ? "/discover" : "/discover/locations";
    router.push(`${basePath}?${params.toString()}`);
    setIsOpen(false);
  }, [filters, router, type]);

  const clearFilters = useCallback(() => {
    setFilters({
      query: "",
      category: "",
      minRating: 0,
      maxDistance: 50,
      hasImages: false,
      hasContact: false,
      isPublic: true,
      sortBy: "relevance",
      sortOrder: "desc",
    });
  }, []);

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.query) count++;
    if (filters.category) count++;
    if (filters.minRating && filters.minRating > 0) count++;
    if (filters.maxDistance && filters.maxDistance < 50) count++;
    if (filters.hasImages) count++;
    if (filters.hasContact) count++;
    if (!filters.isPublic) count++;
    if (filters.sortBy !== "relevance") count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className={className}>
      {/* Quick Search Bar */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`${type === "regions" ? "地域" : "場所"}を検索...`}
            value={filters.query}
            onChange={(e) => updateFilter("query", e.target.value)}
            className="pl-10"
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
          />
        </div>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="h-4 w-4 mr-2" />
              フィルター
              {activeFiltersCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[400px] sm:w-[540px]">
            <SheetHeader>
              <SheetTitle>高度検索フィルター</SheetTitle>
              <SheetDescription>
                詳細な条件で{type === "regions" ? "地域" : "場所"}を検索します
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 mt-6">
              {/* Basic Search */}
              <div className="space-y-2">
                <Label htmlFor="search-query">キーワード検索</Label>
                <Input
                  id="search-query"
                  placeholder="名前、説明文で検索..."
                  value={filters.query}
                  onChange={(e) => updateFilter("query", e.target.value)}
                />
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <Label>カテゴリ</Label>
                <Select
                  value={filters.category}
                  onValueChange={(value) => updateFilter("category", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="カテゴリを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">すべてのカテゴリ</SelectItem>
                    {CATEGORIES[type].map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Rating Filter (for locations only) */}
              {type === "locations" && (
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    最低評価: {filters.minRating}/5
                  </Label>
                  <Slider
                    value={[filters.minRating || 0]}
                    onValueChange={([value]) =>
                      updateFilter("minRating", value)
                    }
                    max={5}
                    step={0.5}
                    className="w-full"
                  />
                </div>
              )}

              {/* Distance Filter */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  最大距離: {filters.maxDistance}km
                </Label>
                <Slider
                  value={[filters.maxDistance || 50]}
                  onValueChange={([value]) =>
                    updateFilter("maxDistance", value)
                  }
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>

              {/* Content Filters */}
              <div className="space-y-4">
                <Label className="text-base font-medium">コンテンツ</Label>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="has-images"
                    checked={filters.hasImages}
                    onCheckedChange={(checked) =>
                      updateFilter("hasImages", checked)
                    }
                  />
                  <Label htmlFor="has-images">画像付きのみ</Label>
                </div>

                {type === "locations" && (
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="has-contact"
                      checked={filters.hasContact}
                      onCheckedChange={(checked) =>
                        updateFilter("hasContact", checked)
                      }
                    />
                    <Label htmlFor="has-contact">連絡先情報付きのみ</Label>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is-public"
                    checked={filters.isPublic}
                    onCheckedChange={(checked) =>
                      updateFilter("isPublic", checked)
                    }
                  />
                  <Label htmlFor="is-public">公開中のみ</Label>
                </div>
              </div>

              {/* Sort Options */}
              <div className="space-y-4">
                <Label className="text-base font-medium">並び順</Label>

                <div className="space-y-2">
                  <Label>並び替え</Label>
                  <Select
                    value={filters.sortBy}
                    onValueChange={(value) =>
                      updateFilter("sortBy", value as SearchFilters["sortBy"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>順序</Label>
                  <Select
                    value={filters.sortOrder}
                    onValueChange={(value) =>
                      updateFilter(
                        "sortOrder",
                        value as SearchFilters["sortOrder"],
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">降順</SelectItem>
                      <SelectItem value="asc">昇順</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Active Filters Display */}
              {activeFiltersCount > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">
                      適用中のフィルター
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {filters.query && (
                        <Badge variant="secondary" className="gap-1">
                          検索: {filters.query}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => updateFilter("query", "")}
                          />
                        </Badge>
                      )}
                      {filters.category && (
                        <Badge variant="secondary" className="gap-1">
                          {filters.category}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => updateFilter("category", "")}
                          />
                        </Badge>
                      )}
                      {filters.minRating && filters.minRating > 0 && (
                        <Badge variant="secondary" className="gap-1">
                          評価{filters.minRating}+
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => updateFilter("minRating", 0)}
                          />
                        </Badge>
                      )}
                      {filters.hasImages && (
                        <Badge variant="secondary" className="gap-1">
                          画像付き
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => updateFilter("hasImages", false)}
                          />
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button onClick={applyFilters} className="flex-1">
                  検索実行
                </Button>
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  disabled={activeFiltersCount === 0}
                >
                  リセット
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <Button onClick={applyFilters}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Active Filters Summary */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {filters.query && (
            <Badge variant="secondary" className="gap-1">
              {filters.query}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  updateFilter("query", "");
                  applyFilters();
                }}
              />
            </Badge>
          )}
          {filters.category && (
            <Badge variant="secondary" className="gap-1">
              {filters.category}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  updateFilter("category", "");
                  applyFilters();
                }}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
