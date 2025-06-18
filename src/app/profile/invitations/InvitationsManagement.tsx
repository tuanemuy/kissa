"use client";

import {
  acceptLocationInvitationAction,
  listUserInvitationsAction,
} from "@/actions/location";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserInvitationWithDetails } from "@/core/application/location/listUserInvitations";
import { useCallback, useEffect, useState } from "react";

export function InvitationsManagement() {
  const [invitations, setInvitations] = useState<UserInvitationWithDetails[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptingInvitationId, setAcceptingInvitationId] = useState<
    string | null
  >(null);

  const loadInvitations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const invitationsData = await listUserInvitationsAction();
      setInvitations(invitationsData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "招待の読み込みに失敗しました",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      setAcceptingInvitationId(invitationId);

      const formData = new FormData();
      formData.append("locationEditorId", invitationId);

      await acceptLocationInvitationAction(formData);

      // Reload invitations list
      await loadInvitations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "招待の承諾に失敗しました");
    } finally {
      setAcceptingInvitationId(null);
    }
  };

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>編集者招待一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">読み込み中...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>編集者招待一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={loadInvitations} className="mt-2">
            再試行
          </Button>
        </CardContent>
      </Card>
    );
  }

  const pendingInvitations = invitations.filter((inv) => inv.isPending);
  const acceptedInvitations = invitations.filter((inv) => !inv.isPending);

  return (
    <div className="space-y-6">
      {/* Pending Invitations */}
      <Card>
        <CardHeader>
          <CardTitle>未承諾の招待 ({pendingInvitations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingInvitations.length === 0 ? (
            <p className="text-muted-foreground">未承諾の招待はありません。</p>
          ) : (
            <div className="space-y-4">
              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50 border-yellow-200"
                >
                  <div className="space-y-2">
                    <div>
                      <h3 className="font-semibold">
                        {invitation.locationName}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        地域: {invitation.regionName}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>
                        招待日:{" "}
                        {new Date(invitation.invitedAt).toLocaleDateString(
                          "ja-JP",
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">招待中</Badge>
                    <Button
                      onClick={() => handleAcceptInvitation(invitation.id)}
                      disabled={acceptingInvitationId === invitation.id}
                    >
                      {acceptingInvitationId === invitation.id
                        ? "承諾中..."
                        : "承諾"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accepted Invitations */}
      <Card>
        <CardHeader>
          <CardTitle>承諾済みの招待 ({acceptedInvitations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {acceptedInvitations.length === 0 ? (
            <p className="text-muted-foreground">
              承諾済みの招待はありません。
            </p>
          ) : (
            <div className="space-y-3">
              {acceptedInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div>
                      <h3 className="font-medium">{invitation.locationName}</h3>
                      <p className="text-sm text-muted-foreground">
                        地域: {invitation.regionName}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>
                        招待日:{" "}
                        {new Date(invitation.invitedAt).toLocaleDateString(
                          "ja-JP",
                        )}
                      </p>
                      {invitation.acceptedAt && (
                        <p>
                          承諾日:{" "}
                          {new Date(invitation.acceptedAt).toLocaleDateString(
                            "ja-JP",
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  <Badge variant="default">承諾済み</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
