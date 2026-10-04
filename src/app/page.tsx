"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { AppShell } from "../components/app-shell";
import { ClientPortalView } from "../components/client-portal-view";
import { ClientTaskDrawer } from "../components/client-task-drawer";
import { CreateTaskModal } from "../components/create-task-modal";
import { StandupSummaryModal } from "../components/standup-summary-modal";
import { TaskBoard } from "../components/task-board";
import { TaskDetailDrawer } from "../components/task-detail-drawer";
import { TaskTable } from "../components/task-table";
import { Button } from "../components/ui/button";
import { BoardSkeleton, TableSkeleton } from "../components/ui/skeleton";
import { EmptyState, ErrorState } from "../components/ui-states";
import { getApiErrorMessage } from "../lib/api";
import { clientApi } from "../lib/client-api";
import { buildQueryParams, type QueryFilterOptions } from "../lib/ezfilter";
import { internalApi } from "../lib/internal-api";
import { useAuthStore } from "../stores/auth-store";
import type { ClientProject, ClientTask, Project, Task, User } from "../types";

export default function DashboardPage() {
  const { user, token, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background bg-ambient flex items-center justify-center text-muted">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-xs font-mono">Authenticating with NodeWave API...</span>
        </div>
      </div>
    );
  }

  // Remount all workspace drafts/modal state even when the same user gets a new session.
  const sessionKey = `${user.id}:${user.role}:${token}`;
  return user.role === "CLIENT" ? (
    <ClientDashboard key={sessionKey} user={user} />
  ) : (
    <InternalDashboard key={sessionKey} user={user} />
  );
}

function WorkspaceState({ user, children }: { user: User; children: ReactNode }) {
  return (
    <AppShell
      projects={[]}
      activeView="board"
      onSelectProject={() => {}}
      onViewChange={() => {}}
      onOpenStandup={() => {}}
      userRole={user.role}
    >
      {children}
    </AppShell>
  );
}

function InternalDashboard({ user }: { user: User }) {
  const { activeProjectId, setActiveProjectId } = useAuthStore();
  const projectsQuery = useQuery({
    queryKey: ["projects", "internal", user.id],
    queryFn: ({ signal }) => internalApi.projects(signal),
  });
  if (projectsQuery.isPending)
    return (
      <WorkspaceState user={user}>
        <BoardSkeleton />
      </WorkspaceState>
    );
  if (projectsQuery.isError)
    return (
      <WorkspaceState user={user}>
        <ErrorState
          title="Failed to load project workspace"
          message={getApiErrorMessage(projectsQuery.error, projectsQuery.error.message)}
          onRetry={() => void projectsQuery.refetch()}
        />
      </WorkspaceState>
    );
  const projects = projectsQuery.data;
  const project = projects.find((item) => item.id === activeProjectId) ?? projects[0];
  if (!project)
    return (
      <WorkspaceState user={user}>
        <EmptyState
          title="No accessible projects"
          message="Ask your Product Manager to add you to a project."
        />
      </WorkspaceState>
    );
  return (
    <InternalProjectView
      key={project.id}
      user={user}
      project={project}
      projects={projects}
      onSelectProject={setActiveProjectId}
    />
  );
}

function InternalProjectView({
  user,
  project,
  projects,
  onSelectProject,
}: {
  user: User;
  project: Project;
  projects: Project[];
  onSelectProject: (id: string) => void;
}) {
  const [activeView, setActiveView] = useState<"board" | "table">("board");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isStandupModalOpen, setIsStandupModalOpen] = useState(false);
  const [tablePage, setTablePage] = useState(1);
  const [tableRows, setTableRows] = useState(20);
  const [tableOrderKey, setTableOrderKey] = useState("createdAt");
  const [tableOrderRule, setTableOrderRule] = useState<"asc" | "desc">("desc");
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const needsTaskCandidates = selectedTask !== null || isCreateModalOpen;

  const allTasksQuery = useQuery({
    queryKey: ["tasks", "internal", user.id, project.id, "all"],
    queryFn: ({ signal }) => internalApi.tasks(project.id, signal),
    enabled: activeView === "board" || needsTaskCandidates,
  });
  const tasksQuery = useQuery({
    queryKey: [
      "tasks",
      "internal",
      user.id,
      project.id,
      activeView,
      tablePage,
      tableRows,
      tableOrderKey,
      tableOrderRule,
      searchFilter,
      statusFilter,
    ],
    queryFn: ({ signal }) => {
      const options: QueryFilterOptions = {
        page: tablePage,
        rows: tableRows,
        orderKey: tableOrderKey,
        orderRule: tableOrderRule,
      };
      if (searchFilter) options.searchFilters = { title: searchFilter };
      if (statusFilter !== "ALL") options.filters = { status: statusFilter };
      return internalApi.taskPage(
        project.id,
        {
          ...buildQueryParams(options),
          page: tablePage,
          rows: tableRows,
        },
        signal,
      );
    },
    enabled: activeView === "table",
  });
  const viewQuery = activeView === "board" ? allTasksQuery : tasksQuery;
  const tasks = activeView === "board" ? (allTasksQuery.data ?? []) : (tasksQuery.data?.data ?? []);
  const allTasks = allTasksQuery.data ?? [];
  const candidatesReady = allTasksQuery.data !== undefined;
  const meta = tasksQuery.data?.meta ?? { page: 1, rows: 20, total: 0, totalPages: 1 };

  const handleSortChange = (key: string) => {
    if (tableOrderKey === key)
      setTableOrderRule((previous) => (previous === "asc" ? "desc" : "asc"));
    else {
      setTableOrderKey(key);
      setTableOrderRule("desc");
    }
    setTablePage(1);
  };

  return (
    <AppShell
      projects={projects}
      activeProjectId={project.id}
      onSelectProject={onSelectProject}
      activeView={activeView}
      onViewChange={setActiveView}
      onOpenStandup={() => setIsStandupModalOpen(true)}
      userRole={user.role}
    >
      {viewQuery.isPending && (activeView === "board" ? <BoardSkeleton /> : <TableSkeleton />)}
      {viewQuery.isError && (
        <ErrorState
          title="Failed to load deliverables"
          message={getApiErrorMessage(viewQuery.error, viewQuery.error?.message)}
          onRetry={() => void viewQuery.refetch()}
        />
      )}
      {!viewQuery.isPending &&
        !viewQuery.isError &&
        (activeView === "board" ? (
          <TaskBoard
            tasks={tasks}
            user={user}
            onSelectTask={setSelectedTask}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
          />
        ) : (
          <TaskTable
            tasks={tasks}
            onSelectTask={setSelectedTask}
            page={tablePage}
            rows={tableRows}
            total={meta.total}
            onPageChange={setTablePage}
            onRowsChange={(rows) => {
              setTableRows(rows);
              setTablePage(1);
            }}
            onSortChange={handleSortChange}
            searchFilter={searchFilter}
            onSearchChange={(search) => {
              setSearchFilter(search);
              setTablePage(1);
            }}
            statusFilter={statusFilter}
            onStatusFilterChange={(status) => {
              setStatusFilter(status);
              setTablePage(1);
            }}
          />
        ))}
      {needsTaskCandidates && !candidatesReady && (
        <div className="fixed inset-0 z-50 flex justify-end bg-overlay backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-surface p-6 space-y-4">
            {allTasksQuery.isError ? (
              <ErrorState
                title="Unable to load dependency candidates"
                message={getApiErrorMessage(allTasksQuery.error, allTasksQuery.error.message)}
                onRetry={() => void allTasksQuery.refetch()}
              />
            ) : (
              <BoardSkeleton />
            )}
            <Button
              variant="ghost"
              onClick={() => {
                setSelectedTask(null);
                setIsCreateModalOpen(false);
              }}
            >
              Close
            </Button>
          </div>
        </div>
      )}
      {selectedTask && candidatesReady && (
        <TaskDetailDrawer
          key={selectedTask.id}
          task={selectedTask}
          allTasks={allTasks}
          user={user}
          onClose={() => setSelectedTask(null)}
        />
      )}
      {user.role === "PM" && candidatesReady && (
        <CreateTaskModal
          projectId={project.id}
          members={project.members ?? []}
          userId={user.id}
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          existingTasks={allTasks}
        />
      )}
      <StandupSummaryModal
        userId={user.id}
        projectId={project.id}
        isOpen={isStandupModalOpen}
        onClose={() => setIsStandupModalOpen(false)}
      />
    </AppShell>
  );
}

function ClientDashboard({ user }: { user: User }) {
  const { activeProjectId, setActiveProjectId } = useAuthStore();
  const projectsQuery = useQuery({
    queryKey: ["projects", "client", user.id],
    queryFn: ({ signal }) => clientApi.projects(signal),
  });
  if (projectsQuery.isPending)
    return (
      <WorkspaceState user={user}>
        <BoardSkeleton />
      </WorkspaceState>
    );
  if (projectsQuery.isError)
    return (
      <WorkspaceState user={user}>
        <ErrorState
          title="Failed to load client workspace"
          message={getApiErrorMessage(projectsQuery.error, projectsQuery.error.message)}
          onRetry={() => void projectsQuery.refetch()}
        />
      </WorkspaceState>
    );
  const projects = projectsQuery.data;
  const project = projects.find((item) => item.id === activeProjectId) ?? projects[0];
  if (!project)
    return (
      <WorkspaceState user={user}>
        <EmptyState title="No accessible client projects" />
      </WorkspaceState>
    );
  return (
    <ClientProjectView
      key={project.id}
      user={user}
      project={project}
      projects={projects}
      onSelectProject={setActiveProjectId}
    />
  );
}

function ClientProjectView({
  user,
  project,
  projects,
  onSelectProject,
}: {
  user: User;
  project: ClientProject;
  projects: ClientProject[];
  onSelectProject: (id: string) => void;
}) {
  const [selectedTask, setSelectedTask] = useState<ClientTask | null>(null);
  const tasksQuery = useQuery({
    queryKey: ["tasks", "client", user.id, project.id],
    queryFn: ({ signal }) => clientApi.tasks(project.id, signal),
  });
  const metricsQuery = useQuery({
    queryKey: ["metrics", "client", user.id, project.id],
    queryFn: ({ signal }) => clientApi.metrics(project.id, signal),
  });
  return (
    <AppShell
      projects={projects}
      activeProjectId={project.id}
      onSelectProject={onSelectProject}
      activeView="board"
      onViewChange={() => {}}
      onOpenStandup={() => {}}
      userRole="CLIENT"
    >
      {(tasksQuery.isPending || metricsQuery.isPending) && <BoardSkeleton />}
      {(tasksQuery.isError || metricsQuery.isError) && (
        <ErrorState
          title="Failed to load published deliverables"
          message={getApiErrorMessage(
            tasksQuery.error ?? metricsQuery.error,
            (tasksQuery.error ?? metricsQuery.error)?.message,
          )}
          onRetry={() => {
            void tasksQuery.refetch();
            void metricsQuery.refetch();
          }}
        />
      )}
      {tasksQuery.isSuccess && metricsQuery.isSuccess && (
        <ClientPortalView
          tasks={tasksQuery.data}
          metrics={metricsQuery.data}
          projectName={project.name}
          projectKey={project.key}
          onSelectTask={setSelectedTask}
        />
      )}
      {selectedTask && (
        <ClientTaskDrawer
          key={selectedTask.id}
          task={selectedTask}
          userId={user.id}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </AppShell>
  );
}
