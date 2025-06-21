"use client";

import { createRegionAction } from "@/actions/region";
import { uploadImagesAction } from "@/actions/upload";
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
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewRegionPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [address, setAddress] = useState<string>("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);

      // Add location data
      if (location) {
        formData.append("latitude", location.lat.toString());
        formData.append("longitude", location.lng.toString());
      }

      if (address) {
        formData.append("address", address);
      }

      // Upload images first if any
      if (selectedImages.length > 0) {
        const imageFormData = new FormData();
        for (const image of selectedImages) {
          imageFormData.append("images", image);
        }

        const imageUrls = await uploadImagesAction(imageFormData);
        formData.append("imageUrls", JSON.stringify(imageUrls));
      }

      await createRegionAction(formData);
      // Redirect will happen automatically via the server action
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create region");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>新しい地域を作成</CardTitle>
          <CardDescription>
            場所を整理するための新しい地域を作成します。地域は公開・非公開を選択できます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">地域名</Label>
              <Input
                id="name"
                name="name"
                placeholder="地域名を入力してください"
                required
                maxLength={100}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="地域の説明を入力してください..."
                maxLength={1000}
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            <LocationPicker
              onLocationChange={setLocation}
              onAddressChange={setAddress}
              disabled={isSubmitting}
            />

            <ImageUpload
              onImageUpload={setSelectedImages}
              maxFiles={10}
              disabled={isSubmitting}
            />

            <div className="flex items-center space-x-2">
              <Switch id="isPublic" name="isPublic" disabled={isSubmitting} />
              <Label htmlFor="isPublic" className="space-y-1">
                <div className="font-medium">この地域を公開する</div>
                <div className="text-sm text-muted-foreground">
                  公開された地域は他のユーザーから発見・閲覧できます
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
                <Link href="/dashboard">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                地域を作成
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
