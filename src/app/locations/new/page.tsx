"use client";

import { createLocationAction } from "@/actions/location";
import { uploadImagesAction } from "@/actions/upload";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationPicker } from "@/components/ui/location-picker";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, MapPin } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  searchParams: Promise<{ regionId?: string }>;
}

export default async function NewLocationPage({ searchParams }: Props) {
  const params = await searchParams;
  const regionId = params.regionId;

  if (!regionId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>
            Region ID is required to create a location
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <NewLocationForm regionId={regionId} />;
}

function NewLocationForm({ regionId }: { regionId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    formData.append("regionId", regionId);

    // Add location data from map
    if (selectedLocation) {
      formData.set("latitude", selectedLocation.lat.toString());
      formData.set("longitude", selectedLocation.lng.toString());
    }
    if (selectedAddress) {
      formData.set("address", selectedAddress);
    }

    // Add uploaded images
    if (uploadedImages.length > 0) {
      formData.set("images", JSON.stringify(uploadedImages));
    }

    try {
      await createLocationAction(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsSubmitting(false);
    }
  }

  const handleImageUpload = async (files: File[]) => {
    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append("images", file);
      }

      const imageUrls = await uploadImagesAction(formData);
      setUploadedImages((prev) => [...prev, ...imageUrls]);
    } catch (error) {
      setError("画像のアップロードに失敗しました");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/regions/${regionId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Region
        </Link>
      </div>

      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create New Location</CardTitle>
            <CardDescription>Add a new location to your region</CardDescription>
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
                  placeholder="Describe this location (optional)"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  name="category"
                  maxLength={50}
                  placeholder="e.g. Restaurant, Museum, Park (optional)"
                  disabled={isSubmitting}
                />
              </div>

              <LocationPicker
                onLocationChange={setSelectedLocation}
                onAddressChange={setSelectedAddress}
                disabled={isSubmitting}
              />

              {/* Hidden inputs for manual coordinate entry */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">
                    Latitude (optional manual entry)
                  </Label>
                  <Input
                    id="latitude"
                    name="latitude"
                    type="number"
                    step="any"
                    min="-90"
                    max="90"
                    placeholder="-90 to 90"
                    disabled={isSubmitting}
                    value={selectedLocation?.lat || ""}
                    onChange={(e) => {
                      const lat = Number.parseFloat(e.target.value);
                      if (!Number.isNaN(lat) && selectedLocation) {
                        setSelectedLocation({ ...selectedLocation, lat });
                      } else if (!Number.isNaN(lat)) {
                        setSelectedLocation({ lat, lng: 0 });
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">
                    Longitude (optional manual entry)
                  </Label>
                  <Input
                    id="longitude"
                    name="longitude"
                    type="number"
                    step="any"
                    min="-180"
                    max="180"
                    placeholder="-180 to 180"
                    disabled={isSubmitting}
                    value={selectedLocation?.lng || ""}
                    onChange={(e) => {
                      const lng = Number.parseFloat(e.target.value);
                      if (!Number.isNaN(lng) && selectedLocation) {
                        setSelectedLocation({ ...selectedLocation, lng });
                      } else if (!Number.isNaN(lng)) {
                        setSelectedLocation({ lat: 0, lng });
                      }
                    }}
                  />
                </div>
              </div>

              <ImageUpload
                onImageUpload={handleImageUpload}
                onImagesChange={setUploadedImages}
                initialImages={uploadedImages}
                disabled={isSubmitting}
                maxFiles={10}
              />

              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">
                    Contact Information
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        name="contactInfo.phone"
                        type="tel"
                        placeholder="Phone number"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="contactInfo.email"
                        type="email"
                        placeholder="Email address"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        name="contactInfo.website"
                        type="url"
                        placeholder="Website URL"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-medium">
                    Operating Hours
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    {[
                      "monday",
                      "tuesday",
                      "wednesday",
                      "thursday",
                      "friday",
                      "saturday",
                      "sunday",
                    ].map((day) => (
                      <div key={day} className="space-y-2">
                        <Label htmlFor={day} className="capitalize">
                          {day}
                        </Label>
                        <Input
                          id={day}
                          name={`operatingHours.${day}`}
                          placeholder="e.g. 9:00 AM - 5:00 PM"
                          disabled={isSubmitting}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isPublic"
                  name="isPublic"
                  defaultChecked={true}
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
                  {isSubmitting ? "Creating..." : "Create Location"}
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
