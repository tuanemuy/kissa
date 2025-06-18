"use client";

import { getRegionAction, updateRegionAction } from "@/actions/region";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useEffect, useState } from "react";

interface Props {
  params: Promise<{ id: string }>;
}

export default function EditRegionPage({ params }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [region, setRegion] = useState<{
    id: string;
    name: string;
    description: string | null;
    latitude: number | null;
    longitude: number | null;
    isPublic: boolean;
  } | null>(null);
  const [regionId, setRegionId] = useState<string>("");

  useEffect(() => {
    async function loadRegion() {
      const { id } = await params;
      setRegionId(id);

      try {
        const regionData = await getRegionAction(id);
        setRegion(regionData);
      } catch (error) {
        notFound();
      } finally {
        setIsLoading(false);
      }
    }
    loadRegion();
  }, [params]);

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      await updateRegionAction(formData);
      // Redirect will happen automatically via the server action
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update region");
      setIsSubmitting(false);
    }
  };

  if (isLoading || !region) {
    return (
      <div className="container mx-auto py-6 max-w-2xl">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/regions/${regionId}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to Region
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Region</CardTitle>
          <CardDescription>
            Update your region information and settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-6">
            <input type="hidden" name="id" value={regionId} />

            <div className="space-y-2">
              <Label htmlFor="name">Region Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Enter region name"
                defaultValue={region.name}
                required
                maxLength={100}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe your region..."
                defaultValue={region.description || ""}
                maxLength={1000}
                rows={3}
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
                  placeholder="e.g. 35.6762"
                  defaultValue={region.latitude || ""}
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
                  placeholder="e.g. 139.6503"
                  defaultValue={region.longitude || ""}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isPublic"
                name="isPublic"
                defaultChecked={region.isPublic}
                disabled={isSubmitting}
              />
              <Label htmlFor="isPublic" className="space-y-1">
                <div className="font-medium">Make this region public</div>
                <div className="text-sm text-muted-foreground">
                  Public regions can be discovered and viewed by other users
                </div>
              </Label>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                asChild
                disabled={isSubmitting}
              >
                <Link href={`/regions/${regionId}`}>Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Update Region
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
