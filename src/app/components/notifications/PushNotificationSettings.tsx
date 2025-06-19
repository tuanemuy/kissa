"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Mail, MessageSquare, Monitor, Smartphone, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface DeviceToken {
  id: string;
  platform: "web" | "ios" | "android";
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string;
}

interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  channels: {
    web: boolean;
    mobile: boolean;
    email: boolean;
    sms: boolean;
  };
}

export function PushNotificationSettings({ userId }: { userId: string }) {
  const [deviceTokens, setDeviceTokens] = useState<DeviceToken[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    pushEnabled: true,
    emailEnabled: true,
    smsEnabled: false,
    channels: {
      web: true,
      mobile: true,
      email: true,
      sms: false,
    },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkPushSupport();
    loadDeviceTokens();
    loadPreferences();
  }, []);

  const checkPushSupport = () => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setPushSupported(true);
    }
  };

  const loadDeviceTokens = async () => {
    try {
      // Load device tokens from API
      const response = await fetch(
        `/api/notifications/device-tokens?userId=${userId}`,
      );
      if (response.ok) {
        const tokens = await response.json();
        setDeviceTokens(tokens);
      }
    } catch (error) {
      console.error("Failed to load device tokens:", error);
    }
  };

  const loadPreferences = async () => {
    try {
      // Load notification preferences from API
      const response = await fetch(
        `/api/notifications/preferences?userId=${userId}`,
      );
      if (response.ok) {
        const prefs = await response.json();
        setPreferences(prefs);
      }
    } catch (error) {
      console.error("Failed to load preferences:", error);
    }
  };

  const requestNotificationPermission = async () => {
    if (!pushSupported) {
      toast.error("Push notifications are not supported in this browser.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        await registerPushSubscription();
        toast.success("Push notifications enabled successfully.");
      } else {
        toast.error("Please enable notifications in your browser settings.");
      }
    } catch (error) {
      console.error("Failed to request notification permission:", error);
      toast.error("Failed to enable push notifications.");
    }
  };

  const registerPushSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      // Register the subscription with the server
      const response = await fetch("/api/notifications/register-device", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          token: JSON.stringify(subscription),
          platform: "web",
        }),
      });

      if (response.ok) {
        await loadDeviceTokens();
      }
    } catch (error) {
      console.error("Failed to register push subscription:", error);
      throw error;
    }
  };

  const unregisterDevice = async (tokenId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/notifications/device-tokens/${tokenId}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        await loadDeviceTokens();
        toast.success("Device unregistered successfully.");
      } else {
        throw new Error("Failed to unregister device");
      }
    } catch (error) {
      console.error("Failed to unregister device:", error);
      toast.error("Failed to unregister device.");
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreferences = async (
    newPreferences: Partial<NotificationPreferences>,
  ) => {
    setIsLoading(true);
    try {
      const updatedPreferences = { ...preferences, ...newPreferences };

      const response = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          preferences: updatedPreferences,
        }),
      });

      if (response.ok) {
        setPreferences(updatedPreferences);
        toast.success("Notification preferences updated.");
      } else {
        throw new Error("Failed to update preferences");
      }
    } catch (error) {
      console.error("Failed to update preferences:", error);
      toast.error("Failed to update preferences.");
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestNotification = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/notifications/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          title: "Test Notification",
          body: "This is a test notification from Kissa.",
          channels: ["web", "mobile"],
        }),
      });

      if (response.ok) {
        toast.success("Test notification sent successfully.");
      } else {
        throw new Error("Failed to send test notification");
      }
    } catch (error) {
      console.error("Failed to send test notification:", error);
      toast.error("Failed to send test notification.");
    } finally {
      setIsLoading(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "web":
        return <Monitor className="w-4 h-4" />;
      case "ios":
      case "android":
        return <Smartphone className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Push Notifications</CardTitle>
          <CardDescription>
            Manage your notification preferences and registered devices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Push Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push-enabled">Enable Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive real-time notifications on your devices.
              </p>
            </div>
            <div className="flex gap-2">
              <Switch
                id="push-enabled"
                checked={preferences.pushEnabled}
                onCheckedChange={(checked) =>
                  updatePreferences({ pushEnabled: checked })
                }
                disabled={isLoading}
              />
              {pushSupported &&
                !deviceTokens.some((t) => t.platform === "web") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={requestNotificationPermission}
                    disabled={isLoading}
                  >
                    Enable for this browser
                  </Button>
                )}
            </div>
          </div>

          {/* Notification Channels */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Notification Channels</h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Monitor className="w-4 h-4" />
                <Switch
                  id="web-notifications"
                  checked={preferences.channels.web}
                  onCheckedChange={(checked) =>
                    updatePreferences({
                      channels: { ...preferences.channels, web: checked },
                    })
                  }
                  disabled={isLoading}
                />
                <Label htmlFor="web-notifications">Web</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Smartphone className="w-4 h-4" />
                <Switch
                  id="mobile-notifications"
                  checked={preferences.channels.mobile}
                  onCheckedChange={(checked) =>
                    updatePreferences({
                      channels: { ...preferences.channels, mobile: checked },
                    })
                  }
                  disabled={isLoading}
                />
                <Label htmlFor="mobile-notifications">Mobile</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <Switch
                  id="email-notifications"
                  checked={preferences.channels.email}
                  onCheckedChange={(checked) =>
                    updatePreferences({
                      channels: { ...preferences.channels, email: checked },
                    })
                  }
                  disabled={isLoading}
                />
                <Label htmlFor="email-notifications">Email</Label>
              </div>

              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4" />
                <Switch
                  id="sms-notifications"
                  checked={preferences.channels.sms}
                  onCheckedChange={(checked) =>
                    updatePreferences({
                      channels: { ...preferences.channels, sms: checked },
                    })
                  }
                  disabled={isLoading}
                />
                <Label htmlFor="sms-notifications">SMS</Label>
              </div>
            </div>
          </div>

          {/* Test Notification */}
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={sendTestNotification}
              disabled={isLoading || !preferences.pushEnabled}
            >
              Send Test Notification
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Registered Devices */}
      <Card>
        <CardHeader>
          <CardTitle>Registered Devices</CardTitle>
          <CardDescription>
            Devices that can receive push notifications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deviceTokens.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No devices registered for push notifications.
            </p>
          ) : (
            <div className="space-y-3">
              {deviceTokens.map((token) => (
                <div
                  key={token.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {getPlatformIcon(token.platform)}
                    <div>
                      <p className="text-sm font-medium capitalize">
                        {token.platform}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last used:{" "}
                        {new Date(token.lastUsedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={token.isActive ? "default" : "secondary"}>
                      {token.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => unregisterDevice(token.id)}
                      disabled={isLoading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
