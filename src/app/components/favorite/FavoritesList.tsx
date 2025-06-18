import { getUserFavoritesAction } from "@/actions/favorite";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Globe, Heart, Lock, MapPin } from "lucide-react";
import Link from "next/link";

export async function FavoritesList() {
  let favorites: Awaited<ReturnType<typeof getUserFavoritesAction>>;
  try {
    favorites = await getUserFavoritesAction();
  } catch (error) {
    // User might not be authenticated or no favorites
    favorites = { regions: [], locations: [] };
  }

  const totalFavorites = favorites.regions.length + favorites.locations.length;

  if (totalFavorites === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Favorites
          </CardTitle>
          <CardDescription>
            Your favorited regions and locations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Heart className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">
              No favorites yet. Add regions and locations to your favorites.
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
          <Heart className="h-5 w-5" />
          Favorites ({totalFavorites})
        </CardTitle>
        <CardDescription>Your favorited regions and locations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {favorites.regions.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 text-sm text-muted-foreground">
                Regions ({favorites.regions.length})
              </h4>
              <div className="space-y-2">
                {favorites.regions.map((region) => (
                  <div
                    key={region.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-medium truncate">{region.name}</h5>
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
            </div>
          )}

          {favorites.regions.length > 0 && favorites.locations.length > 0 && (
            <Separator />
          )}

          {favorites.locations.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 text-sm text-muted-foreground">
                Locations ({favorites.locations.length})
              </h4>
              <div className="space-y-2">
                {favorites.locations.map((location) => (
                  <div
                    key={location.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-medium truncate">
                          {location.name}
                        </h5>
                        <Badge
                          variant={location.isPublic ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {location.isPublic ? (
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
                        {location.category && (
                          <Badge variant="outline" className="text-xs">
                            {location.category}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span>{location.regionName}</span>
                      </div>
                      {location.description && (
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {location.description}
                        </p>
                      )}
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/locations/${location.id}`}>View</Link>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
