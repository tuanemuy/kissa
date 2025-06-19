"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Cookie, Settings, X } from "lucide-react";
import { useEffect, useState } from "react";

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
}

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
    personalization: false,
  });

  useEffect(() => {
    // Check if user has already given consent
    const existingConsent = localStorage.getItem("cookie-consent");
    if (!existingConsent) {
      setIsVisible(true);
    } else {
      try {
        const consentData = JSON.parse(existingConsent);
        setPreferences(consentData.preferences);
      } catch (error) {
        console.error("Failed to parse cookie consent:", error);
        setIsVisible(true);
      }
    }
  }, []);

  const saveConsent = async (prefs: CookiePreferences) => {
    try {
      const consentData = {
        preferences: prefs,
        timestamp: new Date().toISOString(),
        version: "1.0",
      };

      // Save to localStorage
      localStorage.setItem("cookie-consent", JSON.stringify(consentData));

      // Send to server
      const response = await fetch("/api/privacy/cookie-consent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: getSessionId(),
          ...prefs,
          ipAddress: await getClientIP(),
          userAgent: navigator.userAgent,
        }),
      });

      if (!response.ok) {
        console.error("Failed to save cookie consent to server");
      }

      // Apply consent settings
      applyCookieSettings(prefs);

      setPreferences(prefs);
      setIsVisible(false);
      setShowSettings(false);
    } catch (error) {
      console.error("Failed to save cookie consent:", error);
    }
  };

  const acceptAll = () => {
    saveConsent({
      necessary: true,
      analytics: true,
      marketing: true,
      personalization: true,
    });
  };

  const acceptNecessary = () => {
    saveConsent({
      necessary: true,
      analytics: false,
      marketing: false,
      personalization: false,
    });
  };

  const saveCustomPreferences = () => {
    saveConsent(preferences);
  };

  const getSessionId = (): string => {
    let sessionId = sessionStorage.getItem("session-id");
    if (!sessionId) {
      sessionId =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem("session-id", sessionId);
    }
    return sessionId;
  };

  const getClientIP = async (): Promise<string | undefined> => {
    try {
      const response = await fetch("/api/client-ip");
      const data = await response.json();
      return data.ip;
    } catch {
      return undefined;
    }
  };

  const applyCookieSettings = (prefs: CookiePreferences) => {
    // Apply Google Analytics
    if (prefs.analytics && typeof window !== "undefined") {
      // Enable GA4
      if (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
        window.gtag?.("consent", "update", {
          analytics_storage: "granted",
        });
      }
    }

    // Apply marketing cookies
    if (prefs.marketing) {
      // Enable marketing tracking
      if (typeof window !== "undefined") {
        window.gtag?.("consent", "update", {
          ad_storage: "granted",
          ad_user_data: "granted",
          ad_personalization: "granted",
        });
      }
    }

    // Apply personalization
    if (prefs.personalization) {
      // Enable personalization features
      localStorage.setItem("personalization-enabled", "true");
    } else {
      localStorage.removeItem("personalization-enabled");
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur-sm border-t">
        <Card className="max-w-4xl mx-auto">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Cookie className="w-5 h-5" />
                <CardTitle className="text-lg">Cookie Preferences</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVisible(false)}
                aria-label="Close cookie banner"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <CardDescription>
              We use cookies to enhance your experience, analyze site usage, and
              assist in marketing efforts. You can customize your preferences or
              accept all cookies.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Customize
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Cookie Settings</DialogTitle>
                    <DialogDescription>
                      Choose which cookies you'd like to accept. You can change
                      these settings at any time.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="necessary">Necessary Cookies</Label>
                          <p className="text-sm text-muted-foreground">
                            Essential for website functionality
                          </p>
                        </div>
                        <Switch
                          id="necessary"
                          checked={preferences.necessary}
                          disabled
                          aria-describedby="necessary-description"
                        />
                      </div>
                      <p
                        id="necessary-description"
                        className="text-xs text-muted-foreground"
                      >
                        These cookies are required for the website to work
                        properly and cannot be disabled.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="analytics">Analytics Cookies</Label>
                          <p className="text-sm text-muted-foreground">
                            Help us improve our website
                          </p>
                        </div>
                        <Switch
                          id="analytics"
                          checked={preferences.analytics}
                          onCheckedChange={(checked) =>
                            setPreferences((prev) => ({
                              ...prev,
                              analytics: checked,
                            }))
                          }
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        These cookies collect anonymous data about how you use
                        our website.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="marketing">Marketing Cookies</Label>
                          <p className="text-sm text-muted-foreground">
                            Personalized ads and content
                          </p>
                        </div>
                        <Switch
                          id="marketing"
                          checked={preferences.marketing}
                          onCheckedChange={(checked) =>
                            setPreferences((prev) => ({
                              ...prev,
                              marketing: checked,
                            }))
                          }
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        These cookies are used to show you relevant
                        advertisements.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="personalization">
                            Personalization
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Customize your experience
                          </p>
                        </div>
                        <Switch
                          id="personalization"
                          checked={preferences.personalization}
                          onCheckedChange={(checked) =>
                            setPreferences((prev) => ({
                              ...prev,
                              personalization: checked,
                            }))
                          }
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        These cookies remember your preferences and settings.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowSettings(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button onClick={saveCustomPreferences} className="flex-1">
                      Save Preferences
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="outline" onClick={acceptNecessary}>
                Accept Necessary Only
              </Button>

              <Button onClick={acceptAll}>Accept All Cookies</Button>
            </div>

            <div className="mt-4 pt-4 border-t text-center">
              <p className="text-xs text-muted-foreground">
                Read our{" "}
                <a
                  href="/privacy-policy"
                  className="underline hover:no-underline"
                >
                  Privacy Policy
                </a>{" "}
                and{" "}
                <a
                  href="/cookie-policy"
                  className="underline hover:no-underline"
                >
                  Cookie Policy
                </a>{" "}
                for more information.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
