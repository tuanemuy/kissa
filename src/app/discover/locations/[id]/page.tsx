"use client";

import { getPublicLocationWithStatusAction } from "@/actions/browsing";
import { FavoriteButton } from "@/app/components/favorite/FavoriteButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { LocationWithStats } from "@/core/domain/location/types";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Globe,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function DiscoverLocationPage() {
  const params = useParams();
  const locationId = params.id as string;

  const [location, setLocation] = useState<
    (LocationWithStats & { isFavorited: boolean }) | null
  >(null);
  const [loading, setLoading] = useState(true);

  const loadLocation = useCallback(async () => {
    try {
      const result = await getPublicLocationWithStatusAction(locationId);
      setLocation(result);
    } catch (error) {
      console.error("Failed to load location:", error);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    loadLocation();
  }, [loadLocation]);

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <div className="text-muted-foreground">Loading location...</div>
        </div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            Location not found or not public.
          </div>
          <Button asChild className="mt-4">
            <Link href="/discover">Back to Discovery</Link>
          </Button>
        </div>
      </div>
    );
  }

  const contactInfo = location.contactInfo as {
    phone?: string;
    email?: string;
    website?: string;
  } | null;
  const operatingHours = location.operatingHours as Record<
    string,
    string
  > | null;

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/discover/regions/${location.regionId}`}>
              <ArrowLeft className="h-4 w-4" />
              Back to Region
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-bold">{location.name}</h1>
                <div className="flex items-center gap-3">
                  <FavoriteButton
                    targetId={location.id}
                    targetType="location"
                    isFavorited={location.isFavorited}
                  />
                  {location.category && (
                    <Badge variant="secondary">{location.category}</Badge>
                  )}
                </div>
              </div>

              {location.description && (
                <p className="text-muted-foreground mb-4">
                  {location.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {location.address && (
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {location.address}
                  </div>
                )}
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Created {new Date(location.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {location.latitude !== null && location.longitude !== null && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2" />
                    Latitude: {location.latitude}, Longitude:{" "}
                    {location.longitude}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    * Map integration coming soon
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {(contactInfo?.phone ||
              contactInfo?.email ||
              contactInfo?.website) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {contactInfo?.phone && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-sm">{contactInfo.phone}</span>
                    </div>
                  )}
                  {contactInfo?.email && (
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-sm">{contactInfo.email}</span>
                    </div>
                  )}
                  {contactInfo?.website && (
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
                      <a
                        href={contactInfo.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {contactInfo.website}
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {operatingHours && Object.keys(operatingHours).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Operating Hours</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(operatingHours).map(([day, hours]) => (
                      <div key={day} className="flex justify-between text-sm">
                        <span className="capitalize font-medium">{day}</span>
                        <span className="text-muted-foreground">
                          {hours as string}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">Check-ins</span>
                  </div>
                  <Badge variant="outline">{location.checkInCount}</Badge>
                </div>
              </CardContent>
            </Card>

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Want to check in at this location?
              </p>
              <Button asChild>
                <Link href="/auth/register">Create Account</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
