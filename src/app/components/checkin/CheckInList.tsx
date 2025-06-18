import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CheckInWithUser } from "@/core/domain/checkIn/types";
import { Plus } from "lucide-react";
import Link from "next/link";
import { CheckInCard } from "./CheckInCard";

interface Props {
  checkIns: CheckInWithUser[];
  locationId?: string;
  showLocationInfo?: boolean;
  showActions?: boolean;
  currentUserId?: string;
  title?: string;
  description?: string;
  showCreateButton?: boolean;
}

export function CheckInList({
  checkIns,
  locationId,
  showLocationInfo = false,
  showActions = false,
  currentUserId,
  title = "Check-ins",
  description = "Recent check-ins at this location",
  showCreateButton = false,
}: Props) {
  if (checkIns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            {showCreateButton && locationId && (
              <Link href={`/locations/${locationId}/check-in`}>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Check In
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-4">
              No check-ins yet.
            </p>
            {showCreateButton && locationId && (
              <Link href={`/locations/${locationId}/check-in`}>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Be the first to check in
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>
                {description} ({checkIns.length} check-in
                {checkIns.length !== 1 ? "s" : ""})
              </CardDescription>
            </div>
            {showCreateButton && locationId && (
              <Link href={`/locations/${locationId}/check-in`}>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Check In
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4">
        {checkIns.map((checkIn) => (
          <CheckInCard
            key={checkIn.id}
            checkIn={checkIn}
            showLocationInfo={showLocationInfo}
            showActions={showActions}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  );
}
