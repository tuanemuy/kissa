import { listLocationsAction } from "@/actions/location";
import { deleteRegionAction, getRegionAction } from "@/actions/region";
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
  Edit,
  Globe,
  Lock,
  MapPin,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RegionPage({ params }: Props) {
  const { id } = await params;

  let region: Awaited<ReturnType<typeof getRegionAction>>;
  try {
    region = await getRegionAction(id);
  } catch (error) {
    notFound();
  }

  if (!region) {
    notFound();
  }

  // Fetch locations for this region
  let locations: Awaited<ReturnType<typeof listLocationsAction>>;
  try {
    locations = await listLocationsAction(id);
  } catch (error) {
    locations = { items: [], count: 0 };
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle className="text-2xl">{region.name}</CardTitle>
                  <Badge variant={region.isPublic ? "default" : "secondary"}>
                    {region.isPublic ? (
                      <>
                        <Globe className="mr-1 h-3 w-3" />
                        Public
                      </>
                    ) : (
                      <>
                        <Lock className="mr-1 h-3 w-3" />
                        Private
                      </>
                    )}
                  </Badge>
                </div>
                {region.description && (
                  <CardDescription className="text-base">
                    {region.description}
                  </CardDescription>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/regions/${region.id}/edit`}>
                    <Edit className="h-4 w-4" />
                    Edit
                  </Link>
                </Button>
                <form action={deleteRegionAction}>
                  <input type="hidden" name="id" value={region.id} />
                  <Button variant="destructive" size="sm" type="submit">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </form>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Created</h4>
                <p className="text-sm text-muted-foreground">
                  {region.createdAt.toLocaleDateString()}
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Last Updated</h4>
                <p className="text-sm text-muted-foreground">
                  {region.updatedAt.toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Locations</CardTitle>
                <CardDescription>
                  Manage locations within this region
                </CardDescription>
              </div>
              <Button asChild size="sm">
                <Link href={`/locations/new?regionId=${region.id}`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Location
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {locations.count === 0 ? (
              <div className="text-center py-8">
                <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No locations yet</h3>
                <p className="text-muted-foreground">
                  Add locations to this region to get started.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {locations.items.map((location) => (
                  <Card key={location.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold mb-1">
                            <Link
                              href={`/locations/${location.id}`}
                              className="hover:underline"
                            >
                              {location.name}
                            </Link>
                          </h4>
                          {location.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {location.description}
                            </p>
                          )}
                          {location.address && (
                            <p className="text-sm text-muted-foreground">
                              <MapPin className="inline h-3 w-3 mr-1" />
                              {location.address}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={location.isPublic ? "default" : "secondary"}
                        >
                          {location.isPublic ? "Public" : "Private"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
