"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import type { ClientProject, Project, Role } from "../types";
import { AppSidebar } from "./app-sidebar";
import { Navbar } from "./navbar";

interface AppShellProps {
  children: ReactNode;
  projects: (Project | ClientProject)[];
  activeProjectId?: string;
  onSelectProject: (id: string) => void;
  activeView: "board" | "table";
  onViewChange: (view: "board" | "table") => void;
  onOpenStandup: () => void;
  userRole?: Role;
}

const SIDEBAR_STORAGE_KEY = "nodewave_sidebar_collapsed";

export function AppShell({
  children,
  projects,
  activeProjectId,
  onSelectProject,
  activeView,
  onViewChange,
  onOpenStandup,
  userRole,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleToggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "1" : "0");
  };

  const sidebarItems = [
    { id: "board", label: "Task Board", icon: "board" as const },
    { id: "table", label: "Deliverables Table", icon: "table" as const },
    { id: "standup", label: "Standup Summary", icon: "standup" as const },
  ];

  const handleSidebarSelect = (id: string) => {
    if (id === "standup") {
      onOpenStandup();
      return;
    }
    onViewChange(id as "board" | "table");
  };

  return (
    <div className="min-h-screen bg-background bg-ambient flex flex-col text-foreground">
      <Navbar
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={onSelectProject}
        onOpenStandup={onOpenStandup}
        onOpenMobileSidebar={() => setMobileOpen(true)}
      />

      <div className="flex flex-1 min-h-0">
        {userRole !== "CLIENT" && projects.length > 0 && (
          <AppSidebar
            items={sidebarItems}
            activeView={activeView}
            onSelect={handleSidebarSelect}
            collapsed={collapsed}
            onToggleCollapsed={handleToggleCollapsed}
            userRole={userRole}
            isMobileOpen={mobileOpen}
            onCloseMobile={() => setMobileOpen(false)}
          />
        )}

        <main className="flex-1 min-w-0 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
