"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Bell, Mail, Smartphone } from "lucide-react";
import { useState } from "react";

interface NotificationPreferences {
  emailNotifications: {
    checkInActivity: boolean;
    locationInvitations: boolean;
    contentModeration: boolean;
    systemUpdates: boolean;
  };
  pushNotifications: {
    checkInActivity: boolean;
    locationInvitations: boolean;
    contentModeration: boolean;
    systemUpdates: boolean;
  };
}

export function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailNotifications: {
      checkInActivity: true,
      locationInvitations: true,
      contentModeration: true,
      systemUpdates: false,
    },
    pushNotifications: {
      checkInActivity: false,
      locationInvitations: true,
      contentModeration: true,
      systemUpdates: false,
    },
  });

  const [saving, setSaving] = useState(false);

  const updateEmailNotification = (
    key: keyof NotificationPreferences["emailNotifications"],
    value: boolean,
  ) => {
    setPreferences((prev) => ({
      ...prev,
      emailNotifications: {
        ...prev.emailNotifications,
        [key]: value,
      },
    }));
  };

  const updatePushNotification = (
    key: keyof NotificationPreferences["pushNotifications"],
    value: boolean,
  ) => {
    setPreferences((prev) => ({
      ...prev,
      pushNotifications: {
        ...prev.pushNotifications,
        [key]: value,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    // TODO: Implement actual save functionality
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          通知設定
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Notifications */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-4 w-4" />
            <h3 className="text-sm font-medium">メール通知</h3>
          </div>
          <div className="space-y-4 ml-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">チェックイン活動</Label>
                <p className="text-xs text-muted-foreground">
                  自分の場所にチェックインがあった時
                </p>
              </div>
              <Switch
                checked={preferences.emailNotifications.checkInActivity}
                onCheckedChange={(checked) =>
                  updateEmailNotification("checkInActivity", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">編集者招待</Label>
                <p className="text-xs text-muted-foreground">
                  場所の編集者として招待された時
                </p>
              </div>
              <Switch
                checked={preferences.emailNotifications.locationInvitations}
                onCheckedChange={(checked) =>
                  updateEmailNotification("locationInvitations", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">コンテンツモデレーション</Label>
                <p className="text-xs text-muted-foreground">
                  投稿したコンテンツが審査された時
                </p>
              </div>
              <Switch
                checked={preferences.emailNotifications.contentModeration}
                onCheckedChange={(checked) =>
                  updateEmailNotification("contentModeration", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">システム更新</Label>
                <p className="text-xs text-muted-foreground">
                  新機能やメンテナンスのお知らせ
                </p>
              </div>
              <Switch
                checked={preferences.emailNotifications.systemUpdates}
                onCheckedChange={(checked) =>
                  updateEmailNotification("systemUpdates", checked)
                }
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Push Notifications */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="h-4 w-4" />
            <h3 className="text-sm font-medium">プッシュ通知</h3>
          </div>
          <div className="space-y-4 ml-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">チェックイン活動</Label>
                <p className="text-xs text-muted-foreground">
                  自分の場所にチェックインがあった時
                </p>
              </div>
              <Switch
                checked={preferences.pushNotifications.checkInActivity}
                onCheckedChange={(checked) =>
                  updatePushNotification("checkInActivity", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">編集者招待</Label>
                <p className="text-xs text-muted-foreground">
                  場所の編集者として招待された時
                </p>
              </div>
              <Switch
                checked={preferences.pushNotifications.locationInvitations}
                onCheckedChange={(checked) =>
                  updatePushNotification("locationInvitations", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">コンテンツモデレーション</Label>
                <p className="text-xs text-muted-foreground">
                  投稿したコンテンツが審査された時
                </p>
              </div>
              <Switch
                checked={preferences.pushNotifications.contentModeration}
                onCheckedChange={(checked) =>
                  updatePushNotification("contentModeration", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">システム更新</Label>
                <p className="text-xs text-muted-foreground">
                  新機能やメンテナンスのお知らせ
                </p>
              </div>
              <Switch
                checked={preferences.pushNotifications.systemUpdates}
                onCheckedChange={(checked) =>
                  updatePushNotification("systemUpdates", checked)
                }
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "設定を保存"}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          ※ 通知設定の保存機能は開発中です
        </p>
      </CardContent>
    </Card>
  );
}
