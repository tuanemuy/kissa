"use client";

import { makeFormAccessible, setFieldError } from "@/lib/accessibility";
import { cn } from "@/lib/utils";
import * as React from "react";
import { useAccessibility } from "../accessibility/AccessibilityProvider";

interface AccessibleFormProps
  extends React.FormHTMLAttributes<HTMLFormElement> {
  title?: string;
  description?: string;
  errors?: Record<string, string>;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
}

interface AccessibleFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  required?: boolean;
  error?: string;
  description?: string;
  children: React.ReactElement;
}

interface AccessibleInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  description?: string;
}

const AccessibleForm = React.forwardRef<HTMLFormElement, AccessibleFormProps>(
  (
    {
      className,
      title,
      description,
      errors = {},
      onSubmit,
      children,
      ...props
    },
    ref,
  ) => {
    const { announce } = useAccessibility();
    const formRef = React.useRef<HTMLFormElement>(null);

    React.useImperativeHandle(ref, () => formRef.current!);

    React.useEffect(() => {
      if (formRef.current) {
        makeFormAccessible(formRef.current);
      }
    }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Check for validation errors
      const form = e.currentTarget;
      const formData = new FormData(form);
      const hasErrors = Object.keys(errors).length > 0;

      if (hasErrors) {
        // Announce errors
        const errorCount = Object.keys(errors).length;
        announce(
          `Form has ${errorCount} error${errorCount > 1 ? "s" : ""}`,
          "assertive",
        );

        // Focus first error field
        const firstErrorField = form.querySelector(
          '[aria-invalid="true"]',
        ) as HTMLElement;
        if (firstErrorField) {
          firstErrorField.focus();
        }
        return;
      }

      // Announce form submission
      announce("Form submitted", "polite");

      if (onSubmit) {
        try {
          await onSubmit(e);
          announce("Form submitted successfully", "polite");
        } catch (error) {
          announce("Form submission failed", "assertive");
        }
      }
    };

    return (
      <form
        ref={formRef}
        className={cn("space-y-6", className)}
        onSubmit={handleSubmit}
        role="form"
        aria-labelledby={title ? "form-title" : undefined}
        aria-describedby={description ? "form-description" : undefined}
        {...props}
      >
        {title && (
          <h2 id="form-title" className="text-lg font-semibold">
            {title}
          </h2>
        )}

        {description && (
          <p id="form-description" className="text-sm text-muted-foreground">
            {description}
          </p>
        )}

        {children}
      </form>
    );
  },
);

const AccessibleField = React.forwardRef<HTMLDivElement, AccessibleFieldProps>(
  (
    {
      className,
      label,
      required = false,
      error,
      description,
      children,
      ...props
    },
    ref,
  ) => {
    const fieldId = React.useId();
    const labelId = `${fieldId}-label`;
    const errorId = `${fieldId}-error`;
    const descriptionId = `${fieldId}-description`;

    // Clone child element to add accessibility attributes
    const childWithProps = React.cloneElement(
      children as React.ReactElement<any>,
      {
        id: (children.props as any)?.id || fieldId,
        "aria-labelledby": labelId,
        "aria-describedby":
          [description ? descriptionId : null, error ? errorId : null]
            .filter(Boolean)
            .join(" ") || undefined,
        "aria-invalid": error ? "true" : undefined,
        "aria-required": required,
      },
    );

    return (
      <div ref={ref} className={cn("space-y-2", className)} {...props}>
        <label
          id={labelId}
          htmlFor={
            React.isValidElement(children) && children.props
              ? (children.props as any).id || fieldId
              : fieldId
          }
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
          {required && (
            <span className="text-destructive ml-1" aria-label="required">
              *
            </span>
          )}
        </label>

        {description && (
          <p id={descriptionId} className="text-sm text-muted-foreground">
            {description}
          </p>
        )}

        {childWithProps}

        {error && (
          <p
            id={errorId}
            className="text-sm text-destructive"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);

const AccessibleInput = React.forwardRef<
  HTMLInputElement,
  AccessibleInputProps
>(({ className, type = "text", label, error, description, ...props }, ref) => {
  const inputId = React.useId();
  const { announceError } = useAccessibility();

  React.useEffect(() => {
    if (error && label) {
      announceError(`${label}: ${error}`);
    }
  }, [error, label, announceError]);

  if (label) {
    return (
      <AccessibleField
        label={label}
        required={props.required}
        error={error}
        description={description}
      >
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive",
            className,
          )}
          ref={ref}
          {...props}
        />
      </AccessibleField>
    );
  }

  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        error && "border-destructive",
        className,
      )}
      ref={ref}
      aria-invalid={error ? "true" : undefined}
      {...props}
    />
  );
});

AccessibleForm.displayName = "AccessibleForm";
AccessibleField.displayName = "AccessibleField";
AccessibleInput.displayName = "AccessibleInput";

export { AccessibleForm, AccessibleField, AccessibleInput };
