"use client";

import { pinRegionAction, unpinRegionAction } from "@/actions/favorite";
import { Button } from "@/components/ui/button";
import { Pin } from "lucide-react";
import { useState, useTransition } from "react";

interface PinButtonProps {
  regionId: string;
  isPinned: boolean;
  className?: string;
}

export function PinButton({
  regionId,
  isPinned,
  className = "",
}: PinButtonProps) {
  const [isOptimisticPinned, setIsOptimisticPinned] = useState(isPinned);
  const [isPending, startTransition] = useTransition();

  const handleTogglePin = () => {
    const newPinnedState = !isOptimisticPinned;
    setIsOptimisticPinned(newPinnedState);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("regionId", regionId);

        if (newPinnedState) {
          await pinRegionAction(formData);
        } else {
          await unpinRegionAction(formData);
        }
      } catch (error) {
        console.error("Failed to toggle pin:", error);
        // Revert optimistic update on error
        setIsOptimisticPinned(!newPinnedState);
      }
    });
  };

  return (
    <Button
      onClick={handleTogglePin}
      variant="outline"
      size="sm"
      disabled={isPending}
      className={`${className} transition-colors duration-200`}
    >
      <Pin
        className={`h-4 w-4 mr-2 transition-all duration-200 ${
          isOptimisticPinned
            ? "fill-blue-500 text-blue-500"
            : "text-gray-400 hover:text-blue-400"
        }`}
      />
      {isOptimisticPinned ? "ピン留め中" : "ピン留めする"}
    </Button>
  );
}
