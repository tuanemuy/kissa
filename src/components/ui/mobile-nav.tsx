"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "./button";
import { Sheet, SheetContent, SheetTrigger } from "./sheet";

export interface MobileNavProps {
  trigger?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function MobileNav({
  trigger,
  children,
  className = "",
}: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">メニューを開く</span>
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="left" className={`w-64 p-0 ${className}`}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">メニュー</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <nav className="flex-1 overflow-auto">
            <div onClick={() => setOpen(false)}>{children}</div>
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
