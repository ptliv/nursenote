"use client";

import { ReactNode, useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { UserContext } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AppShellProps {
  userContext: UserContext;
  children: ReactNode;
}

export function AppShell({ userContext, children }: AppShellProps) {
  const [isNavOpen, setIsNavOpen] = useState(false);

  useEffect(() => {
    if (!isNavOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsNavOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isNavOpen]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-72">
        <Sidebar />
      </div>

      <Header userContext={userContext} onOpenNav={() => setIsNavOpen(true)} />

      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-900/45 transition-opacity lg:hidden",
          isNavOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setIsNavOpen(false)}
        aria-hidden="true"
      />

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[86vw] max-w-80 bg-white shadow-2xl transition-transform duration-200 ease-out lg:hidden",
          isNavOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-hidden={!isNavOpen}
      >
        <Sidebar mobile onNavigate={() => setIsNavOpen(false)} onClose={() => setIsNavOpen(false)} />
      </div>

      <main className="px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-5 lg:ml-72 lg:px-8 lg:pb-10 lg:pt-6">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
