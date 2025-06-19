"use client";

import { useEffect, useState } from "react";

export function SkipLinks() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab" && !e.shiftKey) {
        setIsVisible(true);
      }
    };

    const handleBlur = () => {
      setIsVisible(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("click", handleBlur);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", handleBlur);
    };
  }, []);

  const skipLinkClass = `
    fixed top-4 left-4 z-50 px-4 py-2 
    bg-primary text-primary-foreground 
    rounded-md font-medium
    focus:opacity-100 focus:translate-y-0
    transition-all duration-200
    ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}
  `;

  return (
    <nav aria-label="Skip navigation links">
      <a
        href="#main-content"
        className={skipLinkClass}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
      >
        Skip to main content
      </a>
      <a
        href="#primary-navigation"
        className={skipLinkClass}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        style={{ top: "4.5rem" }}
      >
        Skip to navigation
      </a>
      <a
        href="#search"
        className={skipLinkClass}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        style={{ top: "7rem" }}
      >
        Skip to search
      </a>
    </nav>
  );
}
