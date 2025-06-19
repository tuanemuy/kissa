"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Eye, RotateCcw, Type, Volume2, Zap } from "lucide-react";
import { useAccessibility } from "./AccessibilityProvider";

export function AccessibilitySettings() {
  const { config, updateConfig, announce } = useAccessibility();

  const handleAnnouncementsChange = (enabled: boolean) => {
    updateConfig({ announcements: enabled });
    if (enabled) {
      announce("Screen reader announcements enabled");
    }
  };

  const handleHighContrastChange = (enabled: boolean) => {
    updateConfig({ highContrast: enabled });
    announce(`High contrast mode ${enabled ? "enabled" : "disabled"}`);
  };

  const handleReducedMotionChange = (enabled: boolean) => {
    updateConfig({ reducedMotion: enabled });
    announce(`Reduced motion ${enabled ? "enabled" : "disabled"}`);
  };

  const handleTextSizeChange = (size: string) => {
    updateConfig({
      textSize: size as "small" | "medium" | "large" | "extra-large",
    });
    announce(`Text size changed to ${size}`);
  };

  const handleFocusVisibleChange = (enabled: boolean) => {
    updateConfig({ focusVisible: enabled });
    announce(`Focus indicators ${enabled ? "enabled" : "disabled"}`);
  };

  const resetToDefaults = () => {
    updateConfig({
      announcements: true,
      highContrast: false,
      reducedMotion: false,
      textSize: "medium",
      focusVisible: true,
    });
    announce("Accessibility settings reset to defaults");
  };

  const testAnnouncement = () => {
    announce(
      "This is a test announcement to verify screen reader functionality",
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Accessibility Settings
          </CardTitle>
          <CardDescription>
            Customize the interface to meet your accessibility needs. These
            settings follow WCAG 2.1 AA guidelines.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Screen Reader Announcements */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label
                  htmlFor="announcements"
                  className="flex items-center gap-2"
                >
                  <Volume2 className="w-4 h-4" />
                  Screen Reader Announcements
                </Label>
                <p className="text-sm text-muted-foreground">
                  Enable spoken notifications for screen readers
                </p>
              </div>
              <Switch
                id="announcements"
                checked={config.announcements}
                onCheckedChange={handleAnnouncementsChange}
                aria-describedby="announcements-description"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={testAnnouncement}
                disabled={!config.announcements}
              >
                Test Announcement
              </Button>
            </div>
          </div>

          {/* Text Size */}
          <div className="space-y-2">
            <Label htmlFor="text-size" className="flex items-center gap-2">
              <Type className="w-4 h-4" />
              Text Size
            </Label>
            <Select
              value={config.textSize}
              onValueChange={handleTextSizeChange}
            >
              <SelectTrigger
                id="text-size"
                aria-describedby="text-size-description"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small (14px)</SelectItem>
                <SelectItem value="medium">Medium (16px)</SelectItem>
                <SelectItem value="large">Large (18px)</SelectItem>
                <SelectItem value="extra-large">Extra Large (20px)</SelectItem>
              </SelectContent>
            </Select>
            <p
              id="text-size-description"
              className="text-sm text-muted-foreground"
            >
              Adjust the base text size for better readability
            </p>
          </div>

          {/* High Contrast */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label
                htmlFor="high-contrast"
                className="flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                High Contrast Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                Increase color contrast for better visibility
              </p>
            </div>
            <Switch
              id="high-contrast"
              checked={config.highContrast}
              onCheckedChange={handleHighContrastChange}
              aria-describedby="high-contrast-description"
            />
          </div>

          {/* Reduced Motion */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label
                htmlFor="reduced-motion"
                className="flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Reduce Motion
              </Label>
              <p className="text-sm text-muted-foreground">
                Minimize animations and transitions
              </p>
            </div>
            <Switch
              id="reduced-motion"
              checked={config.reducedMotion}
              onCheckedChange={handleReducedMotionChange}
              aria-describedby="reduced-motion-description"
            />
          </div>

          {/* Focus Indicators */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="focus-visible">Enhanced Focus Indicators</Label>
              <p className="text-sm text-muted-foreground">
                Show clear visual indicators when navigating with keyboard
              </p>
            </div>
            <Switch
              id="focus-visible"
              checked={config.focusVisible}
              onCheckedChange={handleFocusVisibleChange}
              aria-describedby="focus-visible-description"
            />
          </div>

          {/* Reset Button */}
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={resetToDefaults}
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Accessibility Information */}
      <Card>
        <CardHeader>
          <CardTitle>Accessibility Features</CardTitle>
          <CardDescription>
            This application is designed to be accessible to all users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium">Keyboard Navigation</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Tab - Navigate forward</li>
                <li>• Shift+Tab - Navigate backward</li>
                <li>• Enter/Space - Activate buttons</li>
                <li>• Escape - Close dialogs</li>
                <li>• Arrow keys - Navigate lists</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Screen Reader Support</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• ARIA labels and descriptions</li>
                <li>• Live region announcements</li>
                <li>• Semantic HTML structure</li>
                <li>• Alternative text for images</li>
                <li>• Form validation messages</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Visual Accessibility</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• WCAG AA color contrast</li>
                <li>• Scalable text and UI</li>
                <li>• High contrast mode</li>
                <li>• Focus indicators</li>
                <li>• Motion preferences</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Compatible Technologies</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• NVDA</li>
                <li>• JAWS</li>
                <li>• VoiceOver</li>
                <li>• TalkBack</li>
                <li>• Dragon NaturallySpeaking</li>
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              If you encounter any accessibility issues, please contact our
              support team at{" "}
              <a
                href="mailto:accessibility@kissa.app"
                className="text-primary underline hover:no-underline"
                aria-label="Email accessibility support team"
              >
                accessibility@kissa.app
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
