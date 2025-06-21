import {
  listPublicLocationsAction,
  searchLocationsAction,
} from "@/actions/browsing";
import { LocationMap } from "@/app/components/location/location-map";
import { AdvancedSearch } from "@/components/ui/advanced-search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageGallery } from "@/components/ui/image-gallery";
import { Input } from "@/components/ui/input";
import type { LocationWithStats } from "@/core/domain/location/types";
import { Clock, Globe, Mail, MapPin, Phone, Search, Star } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

interface Props {
  searchParams: Promise<{
    search?: string;
    category?: string;
    page?: string;
  }>;
}

export default async function LocationsDiscoveryPage({ searchParams }: Props) {
  const params = await searchParams;
  const search = params.search;
  const category = params.category;
  const page = Number.parseInt(params.page || "1", 10);

  const result = search
    ? await searchLocationsAction({
        query: search,
        category,
        pagination: { page, limit: 12 },
      })
    : await listPublicLocationsAction({
        pagination: { page, limit: 12 },
        filter: category ? { category } : undefined,
      });

  if (!result || !result.items) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">場所を発見</h1>
          <p className="text-muted-foreground">
            場所の読み込み中にエラーが発生しました
          </p>
        </div>
      </div>
    );
  }

  const { items: locations, count } = result;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">場所を発見</h1>
        <p className="text-muted-foreground mb-6">
          地域の素晴らしい場所を探索してみてください
        </p>

        <AdvancedSearch type="locations" />
      </div>

      {locations.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">マップビュー</h2>
          <LocationMap
            locations={locations}
            height="400px"
            className="rounded-lg border"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {locations.map((location: LocationWithStats) => (
          <LocationCard key={location.id} location={location} />
        ))}
      </div>

      {locations.length === 0 && (
        <div className="text-center py-12">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">場所が見つかりません</h2>
          <p className="text-muted-foreground">
            {search || category
              ? "検索条件を変更してもう一度お試しください"
              : "まだ公開されている場所がありません"}
          </p>
        </div>
      )}

      {count > 12 && (
        <div className="mt-8 text-center">
          <p className="text-muted-foreground">
            {Math.min(page * 12, count)} / {count} 件の場所を表示中
          </p>
          <div className="flex justify-center gap-2 mt-4">
            {page > 1 && (
              <Button asChild variant="outline">
                <Link
                  href={{
                    pathname: "/discover/locations",
                    query: { ...params, page: page - 1 },
                  }}
                >
                  前のページ
                </Link>
              </Button>
            )}
            {page * 12 < count && (
              <Button asChild variant="outline">
                <Link
                  href={{
                    pathname: "/discover/locations",
                    query: { ...params, page: page + 1 },
                  }}
                >
                  次のページ
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LocationCard({ location }: { location: LocationWithStats }) {
  // For now, we'll use an empty array as images are not implemented yet
  const images: string[] = [];

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-video">
        {images.length > 0 ? (
          <ImageGallery
            images={images.slice(0, 1)}
            alt={location.name}
            showThumbnails={false}
            className="h-full"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <MapPin className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
      </div>

      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{location.name}</CardTitle>
          {location.category && (
            <Badge variant="secondary" className="text-xs">
              {location.category}
            </Badge>
          )}
        </div>
        {location.address && (
          <p className="text-sm text-muted-foreground flex items-center mt-1">
            <MapPin className="h-3 w-3 mr-1" />
            {location.address}
          </p>
        )}
      </CardHeader>

      <CardContent>
        {location.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
            {location.description}
          </p>
        )}

        {location.contactInfo && (
          <div className="space-y-2 text-xs text-muted-foreground mb-4">
            {location.contactInfo.phone && (
              <div className="flex items-center">
                <Phone className="h-3 w-3 mr-2" />
                {location.contactInfo.phone}
              </div>
            )}
            {location.contactInfo.email && (
              <div className="flex items-center">
                <Mail className="h-3 w-3 mr-2" />
                {location.contactInfo.email}
              </div>
            )}
            {location.contactInfo.website && (
              <div className="flex items-center">
                <Globe className="h-3 w-3 mr-2" />
                <a
                  href={location.contactInfo.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  ウェブサイト
                </a>
              </div>
            )}
          </div>
        )}

        {location.operatingHours && (
          <div className="text-xs text-muted-foreground mb-4">
            <div className="flex items-center mb-1">
              <Clock className="h-3 w-3 mr-2" />
              営業時間
            </div>
            <div className="space-y-1 ml-5">
              {Object.entries(location.operatingHours)
                .filter(([_, hours]) => hours)
                .slice(0, 2)
                .map(([day, hours]) => (
                  <div key={day} className="flex justify-between">
                    <span className="capitalize">{day}:</span>
                    <span>{String(hours)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        <Button asChild variant="outline" className="w-full">
          <Link href={`/discover/locations/${location.id}`}>詳細を見る</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
