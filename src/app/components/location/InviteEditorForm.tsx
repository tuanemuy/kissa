"use client";

import { inviteLocationEditorAction } from "@/actions/location";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type InviteLocationEditorInput,
  inviteLocationEditorInputSchema,
} from "@/core/application/location/inviteLocationEditor";
import { locationIdSchema } from "@/core/domain/location/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

type InviteEditorFormProps = {
  locationId: string;
  onSuccess?: () => void;
};

type FormData = InviteLocationEditorInput;

export function InviteEditorForm({
  locationId,
  onSuccess,
}: InviteEditorFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(inviteLocationEditorInputSchema),
    defaultValues: {
      locationId: locationIdSchema.parse(locationId),
      editorEmail: "",
    },
  });

  const onSubmit = async (data: InviteLocationEditorInput) => {
    setIsPending(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append("locationId", data.locationId);
      formData.append("editorEmail", data.editorEmail);

      await inviteLocationEditorAction(formData);

      setSuccess("編集者を招待しました。招待メールが送信されました。");
      reset();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "招待の送信に失敗しました");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>編集者を招待</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="editorEmail">編集者のメールアドレス</Label>
            <Input
              id="editorEmail"
              type="email"
              placeholder="editor@example.com"
              {...register("editorEmail")}
              disabled={isPending}
            />
            {errors.editorEmail && (
              <p className="text-sm text-destructive">
                {errors.editorEmail.message}
              </p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {success && <p className="text-sm text-green-600">{success}</p>}

          <Button type="submit" disabled={isPending}>
            {isPending ? "招待中..." : "招待を送信"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
