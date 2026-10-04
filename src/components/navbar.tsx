"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, LogOut, Menu, Sparkles, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../stores/auth-store";
import type { ClientProject, Project } from "../types";
import { BrandLogo } from "./brand-logo";
import { ThemeToggle } from "./theme-toggle";
import { Badge } from "./ui/badge";
import { Tooltip } from "./ui/tooltip";

interface NavbarProps {
  projects: (Project | ClientProject)[];
  activeProjectId?: string;
  onSelectProject: (id: string) => void;
  onOpenStandup: () => void;
  onOpenMobileSidebar: () => void;
}

export function Navbar({
  projects,
  activeProjectId,
  onSelectProject,
  onOpenStandup,
  onOpenMobileSidebar,
}: NavbarProps) {
  const { user, logout, isLoading } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0];

  const getRoleBadge = () => {
    if (!user) return null;
    if (user.role === "PM") {
      return <Badge variant="deep">PM · Product Lead</Badge>;
    }
    if (user.role === "CLIENT") {
      return <Badge variant="warning">Client Guest</Badge>;
    }
    return <Badge variant="primary">Engineer · {user.department}</Badge>;
  };

  const initials = (user?.name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 px-4 h-14">
        {/* Left: mobile menu + brand + project switcher */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenMobileSidebar}
            className="md:hidden p-2 rounded-lg border border-border text-muted hover:text-foreground transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-4 h-4" strokeWidth={1.5} />
          </button>

          <BrandLogo />

          {projects.length > 0 && (user?.role !== "CLIENT" || projects.length > 1) && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="hidden sm:flex items-center gap-2 ml-4 pl-4 border-l border-border text-left group">
                  <span className="flex flex-col leading-tight">
                    <span className="text-xs font-bold text-foreground group-hover:text-primary-tint transition-colors truncate max-w-[160px]">
                      {activeProject?.name}
                    </span>
                    <span className="text-[10px] font-mono text-faint">{activeProject?.key}</span>
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-faint group-hover:text-primary transition-transform" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="start"
                  sideOffset={8}
                  className="z-50 w-64 max-h-[min(70vh,24rem)] overflow-y-auto rounded-xl border border-border-strong glass bg-surface p-1.5 shadow-glow animate-in-scale"
                >
                  <DropdownMenu.Label className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-faint">
                    Projects
                  </DropdownMenu.Label>
                  {projects.map((p) => (
                    <DropdownMenu.Item
                      key={p.id}
                      onSelect={() => onSelectProject(p.id)}
                      className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground outline-none cursor-pointer hover:bg-surface-raised data-[highlighted]:bg-surface-raised transition-colors"
                    >
                      <span className="flex flex-col leading-tight min-w-0">
                        <span className="truncate">{p.name}</span>
                        <span className="text-[10px] font-mono text-faint">{p.key}</span>
                      </span>
                      {p.id === (activeProject?.id ?? projects[0]?.id) && (
                        <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                      )}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}
        </div>

        {/* Right: standup, theme, role, user menu */}
        <div className="flex items-center gap-2">
          {user?.role !== "CLIENT" && activeProject && (
            <Tooltip content="Daily standup auto-summary per department">
              <button
                onClick={onOpenStandup}
                className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-primary-tint bg-primary/10 hover:bg-primary/20 border border-primary/25 transition-all duration-200"
              >
                <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Standup Summary</span>
              </button>
            </Tooltip>
          )}

          <ThemeToggle />

          <div className="hidden sm:block">{getRoleBadge()}</div>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex items-center gap-2 pl-2 border-l border-border outline-none group">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-deep to-primary text-white text-[11px] font-bold shadow-glow">
                  {initials}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-faint hidden sm:block group-hover:text-foreground transition-colors" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={8}
                className="z-50 w-60 rounded-xl border border-border-strong glass bg-surface p-1.5 shadow-glow animate-in-scale"
              >
                <div className="px-2.5 py-2 border-b border-border mb-1.5">
                  <p className="text-xs font-bold text-foreground truncate">{user?.name}</p>
                  <p className="text-[10px] font-mono text-faint truncate">{user?.email}</p>
                </div>
                <DropdownMenu.Item
                  disabled
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-muted outline-none"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  {user?.role} · {user?.department}
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="h-px bg-border my-1.5" />
                <DropdownMenu.Item
                  onSelect={handleLogout}
                  disabled={isLoading}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-danger outline-none cursor-pointer hover:bg-danger/10 data-[highlighted]:bg-danger/10 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
    </header>
  );
}
