"use client";

import { createCheckInAction, updateCheckInAction } from "@/actions/checkIn";
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
import type { CheckIn } from "@/core/domain/checkIn/types";
import { Star } from "lucide-react";
import { useState } from "react";
import { useActionState } from "react";

interface Props {
  locationId: string;
  locationName: string;
  checkIn?: CheckIn;
  mode: "create" | "edit";
}

export function CheckInForm({
  locationId,
  locationName,
  checkIn,
  mode,
}: Props) {
  const [rating, setRating] = useState(checkIn?.rating ?? 0);
  const [isPublic, setIsPublic] = useState(checkIn?.isPublic ?? true);
  const [comment, setComment] = useState(checkIn?.comment ?? "");

  const action = mode === "create" ? createCheckInAction : updateCheckInAction;
  const [state, formAction, isPending] = useActionState(
    async (
      prevState: { success: boolean; error?: string },
      formData: FormData,
    ) => {
      try {
        // Add rating and isPublic to form data
        formData.set("rating", rating.toString());
        formData.set("isPublic", isPublic.toString());

        if (mode === "edit" && checkIn) {
          formData.set("id", checkIn.id);
        }

        await action(formData);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "An error occurred",
        };
      }
    },
    { success: false },
  );

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {mode === "create" ? "Check In" : "Edit Check-in"}
        </CardTitle>
        <CardDescription>
          {mode === "create"
            ? `Share your experience at ${locationName}`
            : "Update your check-in"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-6">
          <input type="hidden" name="locationId" value={locationId} />

          {state?.error && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
              {state.error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="comment">Comment (optional)</Label>
            <Textarea
              id="comment"
              name="comment"
              placeholder="Share your thoughts about this location..."
              className="min-h-24"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {comment.length}/500 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label>Rating (optional)</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(rating === star ? 0 : star)}
                  className="p-1 hover:bg-muted rounded transition-colors"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="text-sm text-muted-foreground ml-2">
                  {rating}/5
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="photo">Photo (optional)</Label>
            <Input
              id="photo"
              name="photo"
              type="file"
              accept="image/*"
              disabled
              className="opacity-50"
            />
            <p className="text-xs text-muted-foreground">
              Photo upload functionality coming soon
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
            <Label htmlFor="public" className="text-sm">
              Make this check-in public
            </Label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending
                ? mode === "create"
                  ? "Checking in..."
                  : "Updating..."
                : mode === "create"
                  ? "Check In"
                  : "Update Check-in"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
