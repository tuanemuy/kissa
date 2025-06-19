// Accessibility utilities for WCAG 2.1 AA compliance

export interface AccessibilityConfig {
  announcements: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  textSize: "small" | "medium" | "large" | "extra-large";
  focusVisible: boolean;
}

export const defaultAccessibilityConfig: AccessibilityConfig = {
  announcements: true,
  highContrast: false,
  reducedMotion: false,
  textSize: "medium",
  focusVisible: true,
};

// Screen reader announcements
export class ScreenReaderAnnouncer {
  private static instance: ScreenReaderAnnouncer;
  private element: HTMLElement | null = null;

  private constructor() {
    if (typeof window !== "undefined") {
      this.setupAriaLiveRegion();
    }
  }

  static getInstance(): ScreenReaderAnnouncer {
    if (!ScreenReaderAnnouncer.instance) {
      ScreenReaderAnnouncer.instance = new ScreenReaderAnnouncer();
    }
    return ScreenReaderAnnouncer.instance;
  }

  private setupAriaLiveRegion() {
    // Create aria-live region for announcements
    this.element = document.createElement("div");
    this.element.setAttribute("aria-live", "polite");
    this.element.setAttribute("aria-atomic", "true");
    this.element.setAttribute("id", "screen-reader-announcements");
    this.element.className = "sr-only";
    document.body.appendChild(this.element);
  }

  announce(message: string, priority: "polite" | "assertive" = "polite") {
    if (!this.element) return;

    this.element.setAttribute("aria-live", priority);
    this.element.textContent = message;

    // Clear after announcement to allow repeat announcements
    setTimeout(() => {
      if (this.element) {
        this.element.textContent = "";
      }
    }, 1000);
  }

  announceNavigation(pageName: string) {
    this.announce(`Navigated to ${pageName}`, "polite");
  }

  announceFormError(fieldName: string, error: string) {
    this.announce(`Error in ${fieldName}: ${error}`, "assertive");
  }

  announceSuccess(message: string) {
    this.announce(`Success: ${message}`, "polite");
  }

  announceLoading(isLoading: boolean, context?: string) {
    if (isLoading) {
      this.announce(`Loading${context ? ` ${context}` : ""}...`, "polite");
    } else {
      this.announce(
        `Loading complete${context ? ` for ${context}` : ""}`,
        "polite",
      );
    }
  }
}

// Keyboard navigation utilities
export function trapFocus(element: HTMLElement): () => void {
  const focusableElements = element.querySelectorAll(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
  ) as NodeListOf<HTMLElement>;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Tab") {
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }

    if (e.key === "Escape") {
      element.removeAttribute("data-focus-trapped");
      document.removeEventListener("keydown", handleKeyDown);
    }
  };

  element.setAttribute("data-focus-trapped", "true");
  document.addEventListener("keydown", handleKeyDown);
  firstElement?.focus();

  return () => {
    element.removeAttribute("data-focus-trapped");
    document.removeEventListener("keydown", handleKeyDown);
  };
}

export function manageFocus(container: HTMLElement) {
  const previouslyFocused = document.activeElement as HTMLElement;

  return {
    restore: () => {
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    },
  };
}

// Color contrast utilities
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: Number.parseInt(result[1], 16),
        g: Number.parseInt(result[2], 16),
        b: Number.parseInt(result[3], 16),
      }
    : null;
}

function getRelativeLuminance(rgb: {
  r: number;
  g: number;
  b: number;
}): number {
  const rsRGB = rgb.r / 255;
  const gsRGB = rgb.g / 255;
  const bsRGB = rgb.b / 255;

  const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : ((rsRGB + 0.055) / 1.055) ** 2.4;
  const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : ((gsRGB + 0.055) / 1.055) ** 2.4;
  const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : ((bsRGB + 0.055) / 1.055) ** 2.4;

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function calculateContrast(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 0;

  const l1 = getRelativeLuminance(rgb1);
  const l2 = getRelativeLuminance(rgb2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

export function meetsWCAGAA(
  foreground: string,
  background: string,
  isLargeText = false,
): boolean {
  const contrast = calculateContrast(foreground, background);
  return isLargeText ? contrast >= 3 : contrast >= 4.5;
}

export function meetsWCAGAAA(
  foreground: string,
  background: string,
  isLargeText = false,
): boolean {
  const contrast = calculateContrast(foreground, background);
  return isLargeText ? contrast >= 4.5 : contrast >= 7;
}

// Text utilities
export function isReadable(text: string): boolean {
  // Basic readability checks
  if (text.length < 1) return false;

  // Check for adequate spacing
  const words = text.trim().split(/\s+/);
  if (words.length > 1 && text.length / words.length < 3) {
    return false; // Likely too cramped
  }

  return true;
}

export function getPlainText(html: string): string {
  if (typeof window === "undefined") {
    // Server-side: basic HTML stripping
    return html.replace(/<[^>]*>/g, "").trim();
  }

  // Client-side: use DOM parsing
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent?.trim() || "";
}

export function generateAriaLabel(text: string, context?: string): string {
  const plainText = getPlainText(text);
  return context ? `${context}: ${plainText}` : plainText;
}

// Form accessibility utilities
export function associateLabel(input: HTMLInputElement, label: string): void {
  const labelId = `label-${input.id || Math.random().toString(36).substr(2, 9)}`;
  input.setAttribute("aria-labelledby", labelId);

  // Find or create label element
  let labelElement = document.querySelector(
    `label[for="${input.id}"]`,
  ) as HTMLLabelElement;
  if (!labelElement && input.id) {
    labelElement = document.querySelector(`#${labelId}`) as HTMLLabelElement;
  }

  if (labelElement) {
    labelElement.id = labelId;
    labelElement.textContent = label;
  }
}

export function setFieldError(input: HTMLInputElement, error: string): void {
  const errorId = `error-${input.id || Math.random().toString(36).substr(2, 9)}`;

  // Remove existing error
  const existingError = document.querySelector(`#${errorId}`);
  if (existingError) {
    existingError.remove();
  }

  if (error) {
    // Create error element
    const errorElement = document.createElement("div");
    errorElement.id = errorId;
    errorElement.className = "text-red-600 text-sm mt-1";
    errorElement.textContent = error;
    errorElement.setAttribute("role", "alert");

    // Insert after input
    input.parentNode?.insertBefore(errorElement, input.nextSibling);

    // Associate with input
    const describedBy = input.getAttribute("aria-describedby");
    input.setAttribute(
      "aria-describedby",
      describedBy ? `${describedBy} ${errorId}` : errorId,
    );
    input.setAttribute("aria-invalid", "true");

    // Announce error
    ScreenReaderAnnouncer.getInstance().announceFormError(
      input.getAttribute("aria-label") || input.name || "field",
      error,
    );
  } else {
    // Clear error state
    input.removeAttribute("aria-invalid");
    const describedBy = input.getAttribute("aria-describedby");
    if (describedBy) {
      const newDescribedBy = describedBy.replace(errorId, "").trim();
      if (newDescribedBy) {
        input.setAttribute("aria-describedby", newDescribedBy);
      } else {
        input.removeAttribute("aria-describedby");
      }
    }
  }
}

export function makeFormAccessible(form: HTMLFormElement): void {
  // Add form role and labels
  form.setAttribute("role", "form");

  // Find all inputs without labels
  const inputs = form.querySelectorAll(
    "input, textarea, select",
  ) as NodeListOf<HTMLInputElement>;

  for (const input of inputs) {
    if (
      !input.getAttribute("aria-label") &&
      !input.getAttribute("aria-labelledby")
    ) {
      // Try to find associated label
      const label = form.querySelector(
        `label[for="${input.id}"]`,
      ) as HTMLLabelElement;
      if (label) {
        associateLabel(input, label.textContent || "");
      } else {
        // Use placeholder or name as fallback
        const labelText = input.placeholder || input.name || "Input field";
        associateLabel(input, labelText);
      }
    }

    // Add required indicators
    if (input.required && !input.getAttribute("aria-required")) {
      input.setAttribute("aria-required", "true");
    }
  }
}

// Image accessibility utilities
export function generateAltText(src: string, context?: string): string {
  // Extract filename for fallback
  const filename = src.split("/").pop()?.split(".")[0] || "image";

  if (context) {
    return `${context} - ${filename}`;
  }

  return filename;
}

export function makeImagesAccessible(container: HTMLElement): void {
  const images = container.querySelectorAll(
    "img",
  ) as NodeListOf<HTMLImageElement>;

  for (const img of images) {
    if (!img.alt) {
      // Generate alt text if missing
      const context = img
        .closest("[data-context]")
        ?.getAttribute("data-context");
      img.alt = generateAltText(img.src, context || undefined);
    }

    // Add loading announcement for images
    if (!img.complete) {
      img.addEventListener("load", () => {
        ScreenReaderAnnouncer.getInstance().announce(
          `Image loaded: ${img.alt}`,
          "polite",
        );
      });

      img.addEventListener("error", () => {
        ScreenReaderAnnouncer.getInstance().announce(
          `Failed to load image: ${img.alt}`,
          "assertive",
        );
      });
    }
  }
}

// Motion and animation preferences
export function respectsReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function applyMotionPreferences(element: HTMLElement): void {
  if (respectsReducedMotion()) {
    element.style.transition = "none";
    element.style.animation = "none";
    element.style.transform = "none";
  }
}

export function createSafeAnimation(
  element: HTMLElement,
  animation: () => void,
): void {
  if (!respectsReducedMotion()) {
    animation();
  }
}

// Initialize accessibility features
export function initializeAccessibility(): void {
  if (typeof window === "undefined") return;

  // Set up screen reader announcer
  ScreenReaderAnnouncer.getInstance();

  // Add global styles for accessibility
  const style = document.createElement("style");
  style.textContent = `
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    
    .focus-visible {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }
    
    @media (prefers-reduced-motion: reduce) {
      * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
    
    @media (prefers-high-contrast: active) {
      * {
        border-color: currentColor !important;
      }
    }
  `;
  document.head.appendChild(style);

  // Set up global keyboard navigation
  document.addEventListener("keydown", (e) => {
    // Skip links navigation
    if (e.key === "Tab" && e.target === document.body) {
      const skipLink = document.querySelector(
        '[href="#main-content"]',
      ) as HTMLAnchorElement;
      if (skipLink) {
        skipLink.focus();
      }
    }
  });
}
