"use client";

import {
  AlertCircle,
  Image as ImageIcon,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Alert, AlertDescription } from "./alert";
import { Button } from "./button";
import { Card, CardContent } from "./card";
import { Label } from "./label";

export interface ImageUploadProps {
  onImageUpload?: (files: File[]) => void;
  onImagesChange?: (images: string[]) => void;
  maxFiles?: number;
  maxSizeBytes?: number;
  acceptedTypes?: string[];
  initialImages?: string[];
  disabled?: boolean;
  className?: string;
}

export function ImageUpload({
  onImageUpload,
  onImagesChange,
  maxFiles = 5,
  maxSizeBytes = 5 * 1024 * 1024, // 5MB
  acceptedTypes = ["image/jpeg", "image/png", "image/webp"],
  initialImages = [],
  disabled = false,
  className = "",
}: ImageUploadProps) {
  const [images, setImages] = useState<string[]>(initialImages);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `ファイル形式が対応していません。対応形式: ${acceptedTypes.join(", ")}`;
    }
    if (file.size > maxSizeBytes) {
      return `ファイルサイズが大きすぎます。最大: ${Math.round(maxSizeBytes / 1024 / 1024)}MB`;
    }
    return null;
  };

  const handleFiles = useCallback(
    async (files: FileList) => {
      if (disabled) return;

      setError(null);
      const fileArray = Array.from(files);

      if (images.length + fileArray.length > maxFiles) {
        setError(`最大${maxFiles}枚まで選択できます`);
        return;
      }

      // Validate files
      for (const file of fileArray) {
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          return;
        }
      }

      setUploading(true);

      try {
        // Create preview URLs
        const newImageUrls: string[] = [];
        for (const file of fileArray) {
          const url = URL.createObjectURL(file);
          newImageUrls.push(url);
        }

        const updatedImages = [...images, ...newImageUrls];
        setImages(updatedImages);
        onImagesChange?.(updatedImages);
        onImageUpload?.(fileArray);
      } catch (err) {
        setError("画像の処理中にエラーが発生しました");
      } finally {
        setUploading(false);
      }
    },
    [
      images,
      maxFiles,
      disabled,
      onImagesChange,
      onImageUpload,
      maxSizeBytes,
      acceptedTypes,
    ],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      if (disabled || uploading) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFiles(files);
      }
    },
    [disabled, uploading, handleFiles],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
      // Reset input to allow selecting the same file again
      e.target.value = "";
    },
    [handleFiles],
  );

  const removeImage = useCallback(
    (index: number) => {
      if (disabled) return;

      const updatedImages = images.filter((_, i) => i !== index);
      setImages(updatedImages);
      onImagesChange?.(updatedImages);

      // Revoke object URL to prevent memory leaks
      const removedImage = images[index];
      if (removedImage?.startsWith("blob:")) {
        URL.revokeObjectURL(removedImage);
      }
    },
    [images, disabled, onImagesChange],
  );

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <Label className="text-base font-medium">画像をアップロード</Label>
        <p className="text-sm text-muted-foreground mt-1">
          最大{maxFiles}枚、{Math.round(maxSizeBytes / 1024 / 1024)}MBまで対応
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card
        className={`border-2 border-dashed transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !uploading) setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={handleDrop}
      >
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            {uploading ? (
              <div className="space-y-2">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  アップロード中...
                </p>
              </div>
            ) : (
              <>
                <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    画像をドラッグ&ドロップするか、クリックして選択
                  </p>
                  <p className="text-xs text-muted-foreground">
                    JPEG, PNG, WebP形式に対応
                  </p>
                </div>
                <input
                  type="file"
                  multiple
                  accept={acceptedTypes.join(",")}
                  onChange={handleFileInput}
                  disabled={disabled || uploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disabled || uploading}
                  className="pointer-events-none"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  ファイルを選択
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {images.length > 0 && (
        <div>
          <Label className="text-sm font-medium">
            選択された画像 ({images.length})
          </Label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                  <img
                    src={image}
                    alt={`Upload preview ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/placeholder-image.svg";
                    }}
                  />
                </div>
                {!disabled && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImage(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
