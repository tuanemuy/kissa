import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";
import { useAccessibility } from "../accessibility/AccessibilityProvider";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface AccessibleButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
  successText?: string;
  errorText?: string;
}

const AccessibleButton = React.forwardRef<
  HTMLButtonElement,
  AccessibleButtonProps
>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      loadingText = "Loading...",
      successText,
      errorText,
      children,
      onClick,
      disabled,
      "aria-label": ariaLabel,
      ...props
    },
    ref,
  ) => {
    const { announce, config } = useAccessibility();
    const [buttonState, setButtonState] = React.useState<
      "idle" | "loading" | "success" | "error"
    >("idle");

    const Comp = asChild ? Slot : "button";

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) return;

      if (onClick) {
        if (config.announcements) {
          announce(
            `Button activated: ${ariaLabel || children?.toString() || "button"}`,
            "polite",
          );
        }
        onClick(e);
      }
    };

    const isLoading = loading || buttonState === "loading";
    const isDisabled = disabled || isLoading;

    // Enhanced aria attributes
    const ariaAttributes = {
      "aria-label": ariaLabel,
      "aria-busy": isLoading,
      "aria-disabled": isDisabled,
      ...(buttonState === "success" && {
        "aria-describedby": "button-success",
      }),
      ...(buttonState === "error" && { "aria-describedby": "button-error" }),
    };

    const buttonContent = React.useMemo(() => {
      if (buttonState === "loading") {
        return (
          <span className="flex items-center gap-2">
            <span
              className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"
              aria-hidden="true"
            />
            {loadingText}
          </span>
        );
      }

      if (buttonState === "success" && successText) {
        return (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4" aria-hidden="true">
              ✓
            </span>
            {successText}
          </span>
        );
      }

      if (buttonState === "error" && errorText) {
        return (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4" aria-hidden="true">
              ✗
            </span>
            {errorText}
          </span>
        );
      }

      return children;
    }, [buttonState, loadingText, successText, errorText, children]);

    return (
      <>
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          onClick={handleClick}
          disabled={isDisabled}
          {...ariaAttributes}
          {...props}
        >
          {buttonContent}
        </Comp>

        {/* Hidden status messages for screen readers */}
        {buttonState === "success" && successText && (
          <span id="button-success" className="sr-only" role="status">
            {successText}
          </span>
        )}

        {buttonState === "error" && errorText && (
          <span id="button-error" className="sr-only" role="alert">
            {errorText}
          </span>
        )}
      </>
    );
  },
);

AccessibleButton.displayName = "AccessibleButton";

export { AccessibleButton, buttonVariants };
