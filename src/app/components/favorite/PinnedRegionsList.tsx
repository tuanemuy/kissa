import { getUserPinnedRegionsAction } from "@/actions/favorite";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Globe, Lock, MapPin } from "lucide-react";
import Link from "next/link";

export async function PinnedRegionsList() {
  let pinnedRegions: Awaited<ReturnType<typeof getUserPinnedRegionsAction>>;
  try {
    pinnedRegions = await getUserPinnedRegionsAction();
  } catch (error) {
    // User might not be authenticated or no pinned regions
    pinnedRegions = [];
  }

  if (pinnedRegions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Pinned Regions
          </CardTitle>
          <CardDescription>
            Quick access to your favorite regions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <MapPin className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">
              No pinned regions yet. Pin regions for quick access.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Pinned Regions ({pinnedRegions.length})
        </CardTitle>
        <CardDescription>Quick access to your favorite regions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pinnedRegions.map((region) => (
            <div
              key={region.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium truncate">{region.name}</h4>
                  <Badge
                    variant={region.isPublic ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {region.isPublic ? (
                      <>
                        <Globe className="w-2 h-2 mr-1" />
                        Public
                      </>
                    ) : (
                      <>
                        <Lock className="w-2 h-2 mr-1" />
                        Private
                      </>
                    )}
                  </Badge>
                </div>
                {region.description && (
                  <p className="text-sm text-muted-foreground truncate">
                    {region.description}
                  </p>
                )}
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/regions/${region.id}`}>View</Link>
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
