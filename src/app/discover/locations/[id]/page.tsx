import { getLocationByIdAction } from "@/actions/browsing";
import { listCheckInsWithUserAction } from "@/actions/checkIn";
import { CheckInForm } from "@/app/components/checkin/CheckInForm";
import { CheckInList } from "@/app/components/checkin/CheckInList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageGallery } from "@/components/ui/image-gallery";
import { Map as MapComponent } from "@/components/ui/map";
import { MapMarker } from "@/components/ui/map-marker";
import type { CheckIn } from "@/core/domain/checkIn/types";
import type { LocationId } from "@/core/domain/location/types";
import {
  ArrowLeft,
  Clock,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Star,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LocationDetailPage({ params }: Props) {
  const { id } = await params;

  const [location, checkInsResult] = await Promise.all([
    getLocationByIdAction(id),
    listCheckInsWithUserAction({
      filter: { locationId: id as LocationId },
      pagination: { page: 1, limit: 10 },
    }),
  ]);

  if (!location) {
    notFound();
  }

  const checkIns = checkInsResult.items || [];
  // For now, we'll use an empty array as images are not implemented yet
  const images: string[] = [];

  // Calculate average rating
  const averageRating =
    checkIns.length > 0
      ? checkIns.reduce(
          (sum: number, checkIn: CheckIn) => sum + (checkIn.rating || 0),
          0,
        ) / checkIns.length
      : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Navigation */}
      <div className="mb-6">
        <Button asChild variant="ghost" className="text-muted-foreground">
          <Link href="/discover/locations">
            <ArrowLeft className="h-4 w-4 mr-2" />
            場所一覧に戻る
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{location.name}</h1>
                {location.category && (
                  <Badge variant="secondary" className="mb-2">
                    {location.category}
                  </Badge>
                )}
                {location.address && (
                  <p className="text-muted-foreground flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    {location.address}
                  </p>
                )}
              </div>
              {averageRating > 0 && (
                <div className="text-right">
                  <div className="flex items-center text-yellow-500">
                    <Star className="h-5 w-5 fill-current mr-1" />
                    <span className="text-lg font-semibold">
                      {averageRating.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {checkIns.length} 件のレビュー
                  </p>
                </div>
              )}
            </div>

            {location.description && (
              <p className="text-muted-foreground">{location.description}</p>
            )}
          </div>

          {/* Images */}
          {images.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>写真</CardTitle>
              </CardHeader>
              <CardContent>
                <ImageGallery images={images} alt={location.name} />
              </CardContent>
            </Card>
          )}

          {/* Map */}
          {location.latitude !== null && location.longitude !== null && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  場所
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MapComponent
                  center={{ lat: location.latitude, lng: location.longitude }}
                  zoom={15}
                  height="300px"
                  onMapReady={(map) => {
                    if (
                      location.latitude !== null &&
                      location.longitude !== null
                    ) {
                      const marker = new google.maps.Marker({
                        position: {
                          lat: location.latitude,
                          lng: location.longitude,
                        },
                        map,
                        title: location.name,
                      });

                      const infoWindow = new google.maps.InfoWindow({
                        content: `<h3>${location.name}</h3><p>${location.address || ""}</p>`,
                      });

                      marker.addListener("click", () => {
                        infoWindow.open(map, marker);
                      });
                    }
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* Check-ins and Reviews */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageCircle className="h-5 w-5 mr-2" />
                チェックイン・レビュー ({checkIns.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>チェックインを読み込み中...</div>}>
                <CheckInList checkIns={checkIns} />
              </Suspense>

              {checkIns.length === 0 && (
                <p className="text-muted-foreground text-center py-8">
                  まだチェックインがありません。最初のレビューを投稿してみませんか？
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>チェックイン</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>読み込み中...</div>}>
                <CheckInForm
                  locationId={location.id}
                  locationName={location.name}
                  mode="create"
                />
              </Suspense>
            </CardContent>
          </Card>

          {/* Contact Information */}
          {location.contactInfo && (
            <Card>
              <CardHeader>
                <CardTitle>連絡先</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {location.contactInfo.phone && (
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-3 text-muted-foreground" />
                    <span className="text-sm">
                      {location.contactInfo.phone}
                    </span>
                  </div>
                )}
                {location.contactInfo.email && (
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-3 text-muted-foreground" />
                    <a
                      href={`mailto:${location.contactInfo.email}`}
                      className="text-sm hover:underline"
                    >
                      {location.contactInfo.email}
                    </a>
                  </div>
                )}
                {location.contactInfo.website && (
                  <div className="flex items-center">
                    <Globe className="h-4 w-4 mr-3 text-muted-foreground" />
                    <a
                      href={location.contactInfo.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm hover:underline"
                    >
                      ウェブサイト
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Operating Hours */}
          {location.operatingHours && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  営業時間
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {Object.entries(location.operatingHours)
                    .filter(([_, hours]) => hours)
                    .map(([day, hours]) => (
                      <div key={day} className="flex justify-between">
                        <span className="capitalize font-medium">{day}:</span>
                        <span className="text-muted-foreground">
                          {String(hours)}
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Location Details */}
          <Card>
            <CardHeader>
              <CardTitle>詳細情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {location.latitude !== null && location.longitude !== null && (
                <>
                  <div className="flex justify-between">
                    <span>緯度:</span>
                    <span className="text-muted-foreground">
                      {location.latitude.toFixed(6)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>経度:</span>
                    <span className="text-muted-foreground">
                      {location.longitude.toFixed(6)}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span>作成日:</span>
                <span className="text-muted-foreground">
                  {new Date(location.createdAt).toLocaleDateString("ja-JP")}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
