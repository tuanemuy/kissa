"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Download, Shield, Trash2 } from "lucide-react";
import { useState } from "react";

interface PrivacyPreferences {
  profileVisibility: "public" | "friends" | "private";
  showCheckInHistory: boolean;
  showFavoriteLocations: boolean;
  allowLocationInvitations: boolean;
  dataSharing: {
    analytics: boolean;
    marketing: boolean;
    research: boolean;
  };
}

export function PrivacySettings() {
  const [preferences, setPreferences] = useState<PrivacyPreferences>({
    profileVisibility: "public",
    showCheckInHistory: true,
    showFavoriteLocations: true,
    allowLocationInvitations: true,
    dataSharing: {
      analytics: true,
      marketing: false,
      research: false,
    },
  });

  const [saving, setSaving] = useState(false);
  const [dataExporting, setDataExporting] = useState(false);

  const updateDataSharing = (
    key: keyof PrivacyPreferences["dataSharing"],
    value: boolean,
  ) => {
    setPreferences((prev) => ({
      ...prev,
      dataSharing: {
        ...prev.dataSharing,
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

  const handleDataExport = async () => {
    setDataExporting(true);
    // TODO: Implement actual data export functionality
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate export
    setDataExporting(false);
  };

  const handleDeleteAccount = () => {
    // TODO: Implement account deletion flow
    alert("アカウント削除機能は開発中です");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            プライバシー設定
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Visibility */}
          <div>
            <Label className="text-sm font-medium">
              プロフィールの公開範囲
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              他のユーザーに表示されるプロフィール情報の範囲を設定
            </p>
            <Select
              value={preferences.profileVisibility}
              onValueChange={(value: "public" | "friends" | "private") =>
                setPreferences((prev) => ({
                  ...prev,
                  profileVisibility: value,
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">公開（誰でも閲覧可能）</SelectItem>
                <SelectItem value="friends">限定公開（友達のみ）</SelectItem>
                <SelectItem value="private">非公開（自分のみ）</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Activity Visibility */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">活動の公開設定</h3>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">チェックイン履歴を表示</Label>
                <p className="text-xs text-muted-foreground">
                  プロフィールでチェックイン履歴を他の人に見せる
                </p>
              </div>
              <Switch
                checked={preferences.showCheckInHistory}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({
                    ...prev,
                    showCheckInHistory: checked,
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">お気に入りの場所を表示</Label>
                <p className="text-xs text-muted-foreground">
                  プロフィールでお気に入りの場所を他の人に見せる
                </p>
              </div>
              <Switch
                checked={preferences.showFavoriteLocations}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({
                    ...prev,
                    showFavoriteLocations: checked,
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">編集者招待を許可</Label>
                <p className="text-xs text-muted-foreground">
                  他のユーザーから場所の編集者として招待されることを許可
                </p>
              </div>
              <Switch
                checked={preferences.allowLocationInvitations}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({
                    ...prev,
                    allowLocationInvitations: checked,
                  }))
                }
              />
            </div>
          </div>

          <Separator />

          {/* Data Sharing */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">データ共有の設定</h3>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">分析データの提供</Label>
                <p className="text-xs text-muted-foreground">
                  サービス改善のための匿名分析データの提供
                </p>
              </div>
              <Switch
                checked={preferences.dataSharing.analytics}
                onCheckedChange={(checked) =>
                  updateDataSharing("analytics", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">マーケティング目的の利用</Label>
                <p className="text-xs text-muted-foreground">
                  パーソナライズされた広告やおすすめの提供
                </p>
              </div>
              <Switch
                checked={preferences.dataSharing.marketing}
                onCheckedChange={(checked) =>
                  updateDataSharing("marketing", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">研究目的の利用</Label>
                <p className="text-xs text-muted-foreground">
                  学術研究や産業研究への匿名データ提供
                </p>
              </div>
              <Switch
                checked={preferences.dataSharing.research}
                onCheckedChange={(checked) =>
                  updateDataSharing("research", checked)
                }
              />
            </div>
          </div>

          <Separator />

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : "設定を保存"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            データのエクスポート
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            アカウントに関連するすべてのデータをダウンロードできます。
            プロフィール情報、チェックイン履歴、アップロードした画像などが含まれます。
          </p>

          <Button
            onClick={handleDataExport}
            disabled={dataExporting}
            variant="outline"
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            {dataExporting ? "エクスポート中..." : "データをダウンロード"}
          </Button>

          <p className="text-xs text-muted-foreground">
            ※ データエクスポート機能は開発中です
          </p>
        </CardContent>
      </Card>

      {/* Account Deletion */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            アカウントの削除
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            アカウントを削除すると、すべてのデータが永久に失われます。この操作は取り消すことができません。
          </p>

          <div className="space-y-2">
            <Label htmlFor="deleteReason">削除理由（任意）</Label>
            <Textarea
              id="deleteReason"
              placeholder="アカウントを削除する理由をお聞かせください..."
              className="resize-none"
              rows={3}
            />
          </div>

          <Button
            onClick={handleDeleteAccount}
            variant="destructive"
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            アカウントを削除
          </Button>

          <p className="text-xs text-muted-foreground">
            ※ アカウント削除機能は開発中です
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
