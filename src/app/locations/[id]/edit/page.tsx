"use client";

import { getLocationAction, updateLocationAction } from "@/actions/location";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, MapPin } from "lucide-react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditLocationPage({ params }: Props) {
  const { id } = await params;
  return <EditLocationForm locationId={id} />;
}

function EditLocationForm({ locationId }: { locationId: string }) {
  const router = useRouter();
  const [location, setLocation] = useState<{
    id: string;
    name: string;
    description: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    isPublic: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadLocation() {
      try {
        const data = await getLocationAction(locationId);
        setLocation(data);
      } catch (err) {
        notFound();
      } finally {
        setIsLoading(false);
      }
    }
    loadLocation();
  }, [locationId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    formData.append("locationId", locationId);

    try {
      await updateLocationAction(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!location) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/locations/${locationId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Location
        </Link>
      </div>

      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Edit Location</CardTitle>
            <CardDescription>
              Update the details of this location
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Location Name *</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  maxLength={100}
                  defaultValue={location.name}
                  placeholder="Enter location name"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  maxLength={1000}
                  rows={4}
                  defaultValue={location.description || ""}
                  placeholder="Describe this location (optional)"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Address
                </Label>
                <Textarea
                  id="address"
                  name="address"
                  maxLength={500}
                  rows={2}
                  defaultValue={location.address || ""}
                  placeholder="Enter the address (optional)"
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    name="latitude"
                    type="number"
                    step="any"
                    min="-90"
                    max="90"
                    defaultValue={location.latitude || ""}
                    placeholder="-90 to 90"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    name="longitude"
                    type="number"
                    step="any"
                    min="-180"
                    max="180"
                    defaultValue={location.longitude || ""}
                    placeholder="-180 to 180"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isPublic"
                  name="isPublic"
                  defaultChecked={location.isPublic}
                  disabled={isSubmitting}
                />
                <Label htmlFor="isPublic">Make this location public</Label>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
