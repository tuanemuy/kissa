"use client";

import { addFavoriteAction, removeFavoriteAction } from "@/actions/favorite";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useState, useTransition } from "react";

interface FavoriteButtonProps {
  targetId: string;
  targetType: "region" | "location";
  isFavorited: boolean;
  className?: string;
}

export function FavoriteButton({
  targetId,
  targetType,
  isFavorited,
  className = "",
}: FavoriteButtonProps) {
  const [isOptimisticFavorited, setIsOptimisticFavorited] =
    useState(isFavorited);
  const [isPending, startTransition] = useTransition();

  const handleToggleFavorite = () => {
    const newFavoritedState = !isOptimisticFavorited;
    setIsOptimisticFavorited(newFavoritedState);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("targetId", targetId);
        formData.append("targetType", targetType);

        if (newFavoritedState) {
          await addFavoriteAction(formData);
        } else {
          await removeFavoriteAction(formData);
        }
      } catch (error) {
        console.error("Failed to toggle favorite:", error);
        // Revert optimistic update on error
        setIsOptimisticFavorited(!newFavoritedState);
      }
    });
  };

  return (
    <Button
      onClick={handleToggleFavorite}
      variant="outline"
      size="sm"
      disabled={isPending}
      className={`${className} transition-colors duration-200`}
    >
      <Heart
        className={`h-4 w-4 mr-2 transition-all duration-200 ${
          isOptimisticFavorited
            ? "fill-red-500 text-red-500"
            : "text-gray-400 hover:text-red-400"
        }`}
      />
      {isOptimisticFavorited ? "お気に入り済み" : "お気に入りに追加"}
    </Button>
  );
}
