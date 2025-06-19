"use client";

import {
  type AccessibilityConfig,
  ScreenReaderAnnouncer,
  defaultAccessibilityConfig,
  initializeAccessibility,
} from "@/lib/accessibility";
import { createContext, useContext, useEffect, useState } from "react";

interface AccessibilityContextType {
  config: AccessibilityConfig;
  updateConfig: (updates: Partial<AccessibilityConfig>) => void;
  announce: (message: string, priority?: "polite" | "assertive") => void;
  announceNavigation: (pageName: string) => void;
  announceSuccess: (message: string) => void;
  announceError: (message: string) => void;
  announceLoading: (isLoading: boolean, context?: string) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(
  null,
);

export function AccessibilityProvider({
  children,
}: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AccessibilityConfig>(
    defaultAccessibilityConfig,
  );
  const [announcer, setAnnouncer] = useState<ScreenReaderAnnouncer | null>(
    null,
  );

  useEffect(() => {
    // Initialize accessibility features
    initializeAccessibility();
    setAnnouncer(ScreenReaderAnnouncer.getInstance());

    // Load saved preferences
    const saved = localStorage.getItem("accessibility-config");
    if (saved) {
      try {
        const savedConfig = JSON.parse(saved);
        setConfig({ ...defaultAccessibilityConfig, ...savedConfig });
      } catch (error) {
        console.error("Failed to load accessibility config:", error);
      }
    }

    // Detect system preferences
    const detectPreferences = () => {
      const updates: Partial<AccessibilityConfig> = {};

      // Detect reduced motion preference
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        updates.reducedMotion = true;
      }

      // Detect high contrast preference
      if (window.matchMedia("(prefers-contrast: high)").matches) {
        updates.highContrast = true;
      }

      if (Object.keys(updates).length > 0) {
        setConfig((prev) => ({ ...prev, ...updates }));
      }
    };

    detectPreferences();

    // Listen for preference changes
    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const highContrastQuery = window.matchMedia("(prefers-contrast: high)");

    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      setConfig((prev) => ({ ...prev, reducedMotion: e.matches }));
    };

    const handleHighContrastChange = (e: MediaQueryListEvent) => {
      setConfig((prev) => ({ ...prev, highContrast: e.matches }));
    };

    reducedMotionQuery.addListener(handleReducedMotionChange);
    highContrastQuery.addListener(handleHighContrastChange);

    return () => {
      reducedMotionQuery.removeListener(handleReducedMotionChange);
      highContrastQuery.removeListener(handleHighContrastChange);
    };
  }, []);

  useEffect(() => {
    // Apply configuration changes
    const root = document.documentElement;

    // Apply text size
    const textSizes = {
      small: "14px",
      medium: "16px",
      large: "18px",
      "extra-large": "20px",
    };
    root.style.fontSize = textSizes[config.textSize];

    // Apply high contrast
    if (config.highContrast) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }

    // Apply reduced motion
    if (config.reducedMotion) {
      root.classList.add("reduced-motion");
    } else {
      root.classList.remove("reduced-motion");
    }

    // Apply focus visible
    if (config.focusVisible) {
      root.classList.add("focus-visible-enabled");
    } else {
      root.classList.remove("focus-visible-enabled");
    }

    // Save to localStorage
    localStorage.setItem("accessibility-config", JSON.stringify(config));
  }, [config]);

  const updateConfig = (updates: Partial<AccessibilityConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const announce = (
    message: string,
    priority: "polite" | "assertive" = "polite",
  ) => {
    if (config.announcements && announcer) {
      announcer.announce(message, priority);
    }
  };

  const announceNavigation = (pageName: string) => {
    if (config.announcements && announcer) {
      announcer.announceNavigation(pageName);
    }
  };

  const announceSuccess = (message: string) => {
    if (config.announcements && announcer) {
      announcer.announceSuccess(message);
    }
  };

  const announceError = (message: string) => {
    if (config.announcements && announcer) {
      announcer.announce(`Error: ${message}`, "assertive");
    }
  };

  const announceLoading = (isLoading: boolean, context?: string) => {
    if (config.announcements && announcer) {
      announcer.announceLoading(isLoading, context);
    }
  };

  return (
    <AccessibilityContext.Provider
      value={{
        config,
        updateConfig,
        announce,
        announceNavigation,
        announceSuccess,
        announceError,
        announceLoading,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error(
      "useAccessibility must be used within AccessibilityProvider",
    );
  }
  return context;
}
