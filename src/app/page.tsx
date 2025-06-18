import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, MapPin, Star, Users } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="container mx-auto py-6">
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="text-center py-16">
          <h1 className="text-5xl font-bold mb-6">Discover Amazing Places</h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Explore regions and locations created by our community. Share your
            discoveries and connect with fellow travelers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/discover">
                <MapPin className="mr-2 h-5 w-5" />
                Start Exploring
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/auth/register">
                <Users className="mr-2 h-5 w-5" />
                Join Community
              </Link>
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-16">
          <Card>
            <CardHeader>
              <MapPin className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Discover Regions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Browse through amazing regions created by our community. Find
                new places to visit and explore.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Star className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Check-in & Share</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Check-in at locations you visit, share photos and memories with
                the community.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Create & Manage</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Create your own regions and locations. Collaborate with other
                editors to build amazing content.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="bg-muted rounded-lg p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Start Your Journey?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Join thousands of travelers and content creators in building the
            ultimate travel discovery platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/discover">
                Explore Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/auth/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
