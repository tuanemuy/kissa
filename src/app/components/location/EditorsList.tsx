"use client";

import {
  listLocationEditorsAction,
  removeLocationEditorAction,
} from "@/actions/location";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LocationEditor } from "@/core/domain/location/types";
import { useCallback, useEffect, useState } from "react";

type EditorsListProps = {
  locationId: string;
  showRemoveAction?: boolean;
};

export function EditorsList({
  locationId,
  showRemoveAction = true,
}: EditorsListProps) {
  const [editors, setEditors] = useState<LocationEditor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingEditorId, setRemovingEditorId] = useState<string | null>(null);

  const loadEditors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const editorsData = await listLocationEditorsAction(locationId);
      setEditors(editorsData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "編集者の読み込みに失敗しました",
      );
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  const handleRemoveEditor = async (editorId: string) => {
    if (!showRemoveAction) return;

    const confirmed = window.confirm("この編集者を削除しますか？");
    if (!confirmed) return;

    try {
      setRemovingEditorId(editorId);

      const formData = new FormData();
      formData.append("locationId", locationId);
      formData.append("locationEditorId", editorId);

      await removeLocationEditorAction(formData);

      // Reload editors list
      await loadEditors();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "編集者の削除に失敗しました",
      );
    } finally {
      setRemovingEditorId(null);
    }
  };

  useEffect(() => {
    loadEditors();
  }, [loadEditors]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>編集者一覧</CardTitle>
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
          <CardTitle>編集者一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={loadEditors} className="mt-2">
            再試行
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>編集者一覧</CardTitle>
      </CardHeader>
      <CardContent>
        {editors.length === 0 ? (
          <p className="text-muted-foreground">
            招待された編集者はまだいません。
          </p>
        ) : (
          <div className="space-y-3">
            {editors.map((editor) => (
              <div
                key={editor.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div>
                    <p className="font-medium">編集者 ID: {editor.editorId}</p>
                    <p className="text-sm text-muted-foreground">
                      招待日:{" "}
                      {new Date(editor.invitedAt).toLocaleDateString("ja-JP")}
                    </p>
                    {editor.acceptedAt && (
                      <p className="text-sm text-muted-foreground">
                        承諾日:{" "}
                        {new Date(editor.acceptedAt).toLocaleDateString(
                          "ja-JP",
                        )}
                      </p>
                    )}
                  </div>
                  <Badge variant={editor.acceptedAt ? "default" : "secondary"}>
                    {editor.acceptedAt ? "承諾済み" : "招待中"}
                  </Badge>
                </div>

                {showRemoveAction && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveEditor(editor.id)}
                    disabled={removingEditorId === editor.id}
                  >
                    {removingEditorId === editor.id ? "削除中..." : "削除"}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
