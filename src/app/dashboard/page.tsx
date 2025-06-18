import { listRegionsAction } from "@/actions/region";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe, Lock, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

async function RegionsList() {
  const regionsData = await listRegionsAction();
  const { items: regions } = regionsData;

  if (regions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No regions yet</h3>
            <p className="text-muted-foreground">
              Create your first region to get started.
            </p>
            <Button asChild className="mt-4">
              <Link href="/regions/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Region
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {regions.map((region) => (
        <Card key={region.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg">{region.name}</CardTitle>
                {region.description && (
                  <CardDescription className="mt-1 line-clamp-2">
                    {region.description}
                  </CardDescription>
                )}
              </div>
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
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Updated {region.updatedAt.toLocaleDateString()}
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/regions/${region.id}`}>View</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your regions and locations
          </p>
        </div>
        <Button asChild>
          <Link href="/regions/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Region
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Regions</CardTitle>
            <CardDescription>
              Regions are collections of locations that you can manage and
              share.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<RegionsListSkeleton />}>
              <RegionsList />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RegionsListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-16" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-16" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-16" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
