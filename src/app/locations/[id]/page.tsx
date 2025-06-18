import { listCheckInsWithUserAction } from "@/actions/checkIn";
import { getContext } from "@/actions/context";
import { deleteLocationAction, getLocationAction } from "@/actions/location";
import { CheckInList } from "@/app/components/checkin/CheckInList";
import { EditorsList } from "@/app/components/location/EditorsList";
import { InviteEditorForm } from "@/app/components/location/InviteEditorForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { LocationId } from "@/core/domain/location/types";
import {
  ArrowLeft,
  Calendar,
  Edit,
  Globe,
  Lock,
  MapPin,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LocationPage({ params }: Props) {
  const { id } = await params;

  const location = await getLocationAction(id);

  // Get current user for authentication checks
  const context = getContext();
  const userResult = await context.authService.getCurrentUserId();
  const currentUserId = userResult.isOk() ? userResult.value : undefined;

  // Fetch check-ins for this location
  const checkInsResult = await listCheckInsWithUserAction({
    pagination: { page: 1, limit: 10 },
    filter: { locationId: id as LocationId },
    sort: { field: "createdAt", order: "desc" },
  });

  const deleteLocationWithId = deleteLocationAction.bind(null);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/regions/${location.regionId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Region
        </Link>
      </div>

      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <CardTitle className="text-3xl font-bold">
                  {location.name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={location.isPublic ? "default" : "secondary"}>
                    {location.isPublic ? (
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
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`/locations/${id}/edit`}>
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </Link>
                <form action={deleteLocationWithId}>
                  <input type="hidden" name="locationId" value={id} />
                  <input
                    type="hidden"
                    name="regionId"
                    value={location.regionId}
                  />
                  <Button
                    type="submit"
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      if (
                        !confirm(
                          "Are you sure you want to delete this location? This action cannot be undone.",
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
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {location.description && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Description
                </h3>
                <p className="text-sm">{location.description}</p>
              </div>
            )}

            {location.address && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Address
                </h3>
                <p className="text-sm">{location.address}</p>
              </div>
            )}

            {(location.latitude !== null || location.longitude !== null) && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Coordinates
                </h3>
                <p className="text-sm font-mono">
                  {location.latitude?.toFixed(6)},{" "}
                  {location.longitude?.toFixed(6)}
                </p>
              </div>
            )}

            <div className="pt-4 border-t">
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Created {new Date(location.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Updated {new Date(location.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 space-y-6">
          {/* Editor Management Section */}
          {currentUserId && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <InviteEditorForm locationId={id} />
              <EditorsList locationId={id} />
            </div>
          )}

          {/* Check-ins Section */}
          <CheckInList
            checkIns={checkInsResult.items}
            locationId={id}
            showActions={true}
            currentUserId={currentUserId || undefined}
            showCreateButton={!!currentUserId}
          />
        </div>
      </div>
    </div>
  );
}
