import { getCheckInAction } from "@/actions/checkIn";
import { deleteCheckInAction } from "@/actions/checkIn";
import { getContext } from "@/actions/context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  Calendar,
  Edit,
  Globe,
  Lock,
  MapPin,
  Star,
  Trash2,
  User,
} from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CheckInDetailPage({ params }: Props) {
  const { id } = await params;

  const checkIn = await getCheckInAction(id);

  if (!checkIn) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Check-in Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The check-in you're looking for doesn't exist or has been deleted.
          </p>
          <Link href="/dashboard">
            <Button>Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Get current user for ownership checks
  const context = getContext();
  const userResult = await context.authService.getCurrentUserId();
  const currentUserId = userResult.isOk() ? userResult.value : undefined;
  const isOwner = currentUserId === checkIn.userId;

  const deleteCheckInWithId = deleteCheckInAction.bind(null);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/locations/${checkIn.locationId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Location
        </Link>
      </div>

      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <CardTitle className="text-2xl font-bold">
                  Check-in Details
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={checkIn.isPublic ? "default" : "secondary"}>
                    {checkIn.isPublic ? (
                      <>
                        <Globe className="w-3 h-3 mr-1" />
                        Public
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3 mr-1" />
                        Private
                      </>
                    )}
                  </Badge>
                  {checkIn.rating && (
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= (checkIn.rating || 0)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground"
                          }`}
                        />
                      ))}
                      <span className="text-sm text-muted-foreground ml-1">
                        ({checkIn.rating}/5)
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {isOwner && (
                <div className="flex gap-2">
                  <Link href={`/check-ins/${id}/edit`}>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </Link>
                  <form action={deleteCheckInWithId}>
                    <input type="hidden" name="id" value={id} />
                    <Button
                      type="submit"
                      variant="destructive"
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
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </form>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span>Check-in by User {checkIn.userId}</span>
            </div>

            {checkIn.comment && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Comment
                </h3>
                <p className="text-sm">{checkIn.comment}</p>
              </div>
            )}

            {checkIn.photoUrl && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Photo
                </h3>
                <img
                  src={checkIn.photoUrl}
                  alt="Check-in"
                  className="w-full max-w-2xl h-auto object-cover rounded-md"
                />
              </div>
            )}

            <div className="pt-4 border-t">
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Created {new Date(checkIn.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {checkIn.createdAt !== checkIn.updatedAt && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Updated {new Date(checkIn.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
