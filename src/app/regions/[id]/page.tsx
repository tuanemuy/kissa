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
import { ArrowLeft, Edit, Globe, Lock, MapPin, Trash2 } from "lucide-react";
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
            <CardTitle>Locations</CardTitle>
            <CardDescription>
              Manage locations within this region
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No locations yet</h3>
              <p className="text-muted-foreground">
                Add locations to this region to get started.
              </p>
              <Button asChild className="mt-4">
                <Link href={`/regions/${region.id}/locations/new`}>
                  <MapPin className="mr-2 h-4 w-4" />
                  Add Location
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
