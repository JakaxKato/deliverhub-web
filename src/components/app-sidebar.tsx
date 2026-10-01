"use client";

import {
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Table as TableIcon,
} from "lucide-react";
import { cn } from "../lib/cn";
import type { Role } from "../types";

export interface SidebarItem {
  id: string;
  label: string;
  icon: "board" | "table" | "standup";
}

interface AppSidebarProps {
  items: SidebarItem[];
  activeView: string;
  onSelect: (id: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  userRole?: Role;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

const iconMap = {
  board: LayoutGrid,
  table: TableIcon,
  standup: Sparkles,
} as const;

export function AppSidebar({
  items,
  activeView,
  onSelect,
  collapsed,
  onToggleCollapsed,
  userRole,
  isMobileOpen,
  onCloseMobile,
}: AppSidebarProps) {
  const visibleItems = userRole === "CLIENT" ? [] : items;

  const content = (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-4 pb-2">
        <span
          className={cn(
            "text-[10px] font-mono uppercase tracking-[0.16em] text-faint transition-opacity",
            collapsed && "opacity-0",
          )}
        >
          Workspace
        </span>
      </div>

      <nav className="flex-1 px-2 space-y-1" aria-label="Primary navigation">
        {visibleItems.map((item) => {
          const Icon = iconMap[item.icon];
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelect(item.id);
                onCloseMobile();
              }}
              aria-current={isActive ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all duration-200",
                isActive
                  ? "bg-deep text-white shadow-glow border border-primary/30"
                  : "text-muted hover:text-foreground hover:bg-surface-raised border border-transparent",
                collapsed && "justify-center px-0",
              )}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-2 border-t border-border">
        <button
          onClick={onToggleCollapsed}
          className="w-full hidden md:flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold text-faint hover:text-foreground hover:bg-surface-raised transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-4 h-4 shrink-0" strokeWidth={1.5} />
          ) : (
            <PanelLeftClose className="w-4 h-4 shrink-0" strokeWidth={1.5} />
          )}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col shrink-0 border-r border-border bg-surface/40 backdrop-blur-sm transition-[width] duration-200 ease-out",
          collapsed ? "w-16" : "w-60",
        )}
      >
        {content}
      </aside>

      {/* Mobile drawer */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={onCloseMobile} />
          <div className="relative w-64 h-full bg-surface border-r border-border animate-in">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
