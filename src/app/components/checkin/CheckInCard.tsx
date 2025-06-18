import { deleteCheckInAction } from "@/actions/checkIn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CheckInWithUser } from "@/core/domain/checkIn/types";
import { Calendar, Edit, ExternalLink, Star, Trash2, User } from "lucide-react";
import Link from "next/link";

interface Props {
  checkIn: CheckInWithUser;
  showLocationInfo?: boolean;
  showActions?: boolean;
  currentUserId?: string;
}

export function CheckInCard({
  checkIn,
  showLocationInfo = false,
  showActions = false,
  currentUserId,
}: Props) {
  const deleteCheckInWithId = deleteCheckInAction.bind(null);
  const isOwner = currentUserId === checkIn.userId;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {checkIn.user?.name || "Anonymous"}
              </span>
              {!checkIn.isPublic && (
                <Badge variant="secondary" className="text-xs">
                  Private
                </Badge>
              )}
            </div>
            {checkIn.rating && (
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3 h-3 ${
                      star <= (checkIn.rating || 0)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                ))}
                <span className="text-xs text-muted-foreground ml-1">
                  ({checkIn.rating}/5)
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-1">
            <Link href={`/check-ins/${checkIn.id}`}>
              <Button variant="ghost" size="sm">
                <ExternalLink className="w-3 h-3" />
              </Button>
            </Link>
            {showActions && isOwner && (
              <>
                <Link href={`/check-ins/${checkIn.id}/edit`}>
                  <Button variant="ghost" size="sm">
                    <Edit className="w-3 h-3" />
                  </Button>
                </Link>
                <form action={deleteCheckInWithId}>
                  <input type="hidden" name="id" value={checkIn.id} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      if (
                        !confirm(
                          "Are you sure you want to delete this check-in? This action cannot be undone.",
                        )
                      ) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {checkIn.comment && (
          <div>
            <p className="text-sm">{checkIn.comment}</p>
          </div>
        )}

        {checkIn.photoUrl && (
          <div>
            <img
              src={checkIn.photoUrl}
              alt="Check-in"
              className="w-full h-48 object-cover rounded-md"
            />
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{new Date(checkIn.createdAt).toLocaleDateString()}</span>
          </div>
          {checkIn.createdAt !== checkIn.updatedAt && (
            <div className="flex items-center gap-1">
              <span>
                Updated {new Date(checkIn.updatedAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
