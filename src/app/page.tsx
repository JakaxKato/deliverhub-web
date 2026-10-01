"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ClientPortalView } from "../components/client-portal-view";
import { CreateTaskModal } from "../components/create-task-modal";
import { Navbar } from "../components/navbar";

import { RoleSwitcherBanner } from "../components/role-switcher-banner";
import { StandupSummaryModal } from "../components/standup-summary-modal";
import { TaskBoard } from "../components/task-board";
import { TaskDetailDrawer } from "../components/task-detail-drawer";
import { TaskTable } from "../components/task-table";
import { ErrorState, LoadingState } from "../components/ui-states";
import { api, getApiErrorMessage } from "../lib/api";
import { buildQueryParams, type QueryFilterOptions } from "../lib/ezfilter";
import { useAuthStore } from "../stores/auth-store";
import type { Project, ProjectMetrics, Task } from "../types";

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const router = useRouter();

  const [activeView, setActiveView] = useState<"board" | "table">("board");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isStandupModalOpen, setIsStandupModalOpen] = useState(false);

  // Table & EzFilter Query States
  const [tablePage, setTablePage] = useState(1);
  const [tableRows, setTableRows] = useState(20);
  const [tableOrderKey, setTableOrderKey] = useState("createdAt");
  const [tableOrderRule, setTableOrderRule] = useState<"asc" | "desc">("desc");
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch Projects accessible to this user
  const {
    data: projectsData,
    isLoading: projectsLoading,
    isError: projectsError,
    refetch: refetchProjects,
  } = useQuery<{
    data: Project[];
  }>({
    queryKey: ["projects", user?.id],
    queryFn: async () => {
      const res = await api.get("/projects");
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const projects = projectsData?.data || [];
  const currentProject = projects[0]; // Primary project: NW-CORE

  // Fetch Tasks with EzFilter contract
  const {
    data: tasksResponse,
    isLoading: tasksLoading,
    isError: tasksError,
    error: tasksErrorObj,
    refetch: refetchTasks,
  } = useQuery<{
    data: Task[];
    meta: { page: number; rows: number; total: number; totalPages: number };
  }>({
    queryKey: [
      "tasks",
      currentProject?.id,
      user?.id,
      user?.role,
      activeView,
      tablePage,
      tableRows,
      tableOrderKey,
      tableOrderRule,
      searchFilter,
      statusFilter,
    ],
    queryFn: async () => {
      if (!currentProject)
        return { data: [], meta: { page: 1, rows: 20, total: 0, totalPages: 1 } };

      const params: Record<string, string | number> = {
        projectId: currentProject.id,
      };

      if (activeView === "table") {
        const queryOptions: QueryFilterOptions = {
          page: tablePage,
          rows: tableRows,
          orderKey: tableOrderKey,
          orderRule: tableOrderRule,
        };

        if (searchFilter) {
          queryOptions.searchFilters = { title: searchFilter };
        }

        if (statusFilter && statusFilter !== "ALL") {
          queryOptions.filters = { status: statusFilter };
        }

        const serialized = buildQueryParams(queryOptions);
        Object.assign(params, serialized);
      }

      const res = await api.get("/tasks", { params });
      return res.data;
    },
    enabled: !!currentProject?.id,
  });

  // Fetch Project Aggregate Metrics (for Client and Executive view)
  const {
    data: metricsData,
    isLoading: metricsLoading,
    isError: metricsError,
    refetch: refetchMetrics,
  } = useQuery<{ data: ProjectMetrics }>({
    queryKey: ["metrics", currentProject?.id, user?.id],
    queryFn: async () => {
      const res = await api.get(`/projects/${currentProject.id}/metrics`);
      return res.data;
    },
    enabled: !!currentProject?.id,
  });

  if (authLoading || (!isAuthenticated && !user)) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          <span className="text-xs font-mono">Authenticating with NodeWave API...</span>
        </div>
      </div>
    );
  }

  const tasks = tasksResponse?.data || [];
  const meta = tasksResponse?.meta || { page: 1, rows: 20, total: 0, totalPages: 1 };
  const metrics = metricsData?.data;

  const handleSortChange = (key: string) => {
    if (tableOrderKey === key) {
      setTableOrderRule((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setTableOrderKey(key);
      setTableOrderRule("desc");
    }
  };

  const handleRetry = () => {
    refetchProjects();
    refetchTasks();
    refetchMetrics();
  };

  return (
    <div className="min-h-screen bg-[#090d16] flex flex-col text-slate-100">
      {/* 1-Click Role Switcher for instant assessor testing */}
      <RoleSwitcherBanner />

      {/* Primary Navigation Bar */}
      <Navbar
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenStandup={() => setIsStandupModalOpen(true)}
        projectName={currentProject?.name}
        projectKey={currentProject?.key}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {projectsLoading && <LoadingState label="Loading deliverable workspace..." />}

        {!projectsLoading && projectsError && (
          <ErrorState
            title="Failed to load project workspace"
            message="The NodeWave API could not be reached. Please check that the backend is running and try again."
            onRetry={handleRetry}
          />
        )}

        {!projectsLoading && !projectsError && tasksLoading && (
          <LoadingState label="Loading deliverables..." />
        )}

        {!projectsLoading && !projectsError && tasksError && (
          <ErrorState
            title="Failed to load deliverables"
            message={getApiErrorMessage(
              tasksErrorObj,
              "The NodeWave API could not be reached. Please try again.",
            )}
            onRetry={handleRetry}
          />
        )}

        {/* View 1: Client Guest Dedicated Portal */}
        {!projectsLoading && !projectsError && !tasksLoading && !tasksError && (
          <>
            {user?.role === "CLIENT" && metricsLoading && (
              <LoadingState label="Loading project metrics..." />
            )}

            {user?.role === "CLIENT" && metricsError && (
              <ErrorState
                title="Failed to load project metrics"
                message="The NodeWave API could not be reached. Please try again."
                onRetry={handleRetry}
              />
            )}

            {user?.role === "CLIENT" && !metricsLoading && !metricsError && (
              <ClientPortalView
                metrics={metrics}
                tasks={tasks}
                projectName={currentProject?.name}
                projectKey={currentProject?.key}
                onSelectTask={setSelectedTask}
              />
            )}
          </>
        )}

        {/* View 2: Internal Team & PM Kanban Board */}
        {!projectsLoading &&
          !projectsError &&
          !tasksLoading &&
          !tasksError &&
          user?.role !== "CLIENT" &&
          activeView === "board" && (
            <TaskBoard
              tasks={tasks}
              userRole={user?.role}
              onSelectTask={setSelectedTask}
              onOpenCreateModal={() => setIsCreateModalOpen(true)}
            />
          )}

        {/* View 3: Internal Team & PM Standard EzFilter Table */}
        {!projectsLoading &&
          !projectsError &&
          !tasksLoading &&
          !tasksError &&
          user?.role !== "CLIENT" &&
          activeView === "table" && (
            <TaskTable
              tasks={tasks}
              onSelectTask={setSelectedTask}
              page={tablePage}
              rows={tableRows}
              total={meta.total}
              onPageChange={setTablePage}
              onRowsChange={setTableRows}
              onSortChange={handleSortChange}
              searchFilter={searchFilter}
              onSearchChange={setSearchFilter}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
            />
          )}
      </main>

      {/* Task Detail Drawer */}
      {selectedTask && (
        <TaskDetailDrawer
          task={selectedTask}
          allTasks={tasks}
          userRole={user?.role}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {/* Create Task Modal (PM Only) */}
      {currentProject && (
        <CreateTaskModal
          projectId={currentProject.id}
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          existingTasks={tasks}
        />
      )}

      {/* Daily Standup Auto-Summary Modal */}
      {currentProject && (
        <StandupSummaryModal
          projectId={currentProject.id}
          isOpen={isStandupModalOpen}
          onClose={() => setIsStandupModalOpen(false)}
        />
      )}
    </div>
  );
}
