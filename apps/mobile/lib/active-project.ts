import * as SecureStore from 'expo-secure-store';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

import { useTRPC } from './trpc';

const PROJECT_KEY = 'foundry.active-project-id';
const WORKSPACE_KEY = 'foundry.active-workspace-id';

export async function readActiveProjectId(): Promise<string | null> {
  return SecureStore.getItemAsync(PROJECT_KEY);
}

export async function writeActiveProjectId(projectId: string, workspaceId: string): Promise<void> {
  await SecureStore.setItemAsync(PROJECT_KEY, projectId);
  await SecureStore.setItemAsync(WORKSPACE_KEY, workspaceId);
}

export function useActiveProject() {
  const trpc = useTRPC();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const workspaces = useQuery(trpc.workspace.list.queryOptions());
  const projects = useQuery({
    ...trpc.project.list.queryOptions({
      workspaceId: workspaceId ?? '00000000-0000-4000-8000-000000000000',
    }),
    enabled: workspaceId !== null,
  });

  useEffect(() => {
    void (async () => {
      const storedProject = await SecureStore.getItemAsync(PROJECT_KEY);
      const storedWorkspace = await SecureStore.getItemAsync(WORKSPACE_KEY);
      if (storedWorkspace !== null) {
        setWorkspaceId(storedWorkspace);
      }
      if (storedProject !== null) {
        setProjectId(storedProject);
      }
    })();
  }, []);

  useEffect(() => {
    if (workspaceId !== null || workspaces.data === undefined || workspaces.data.length === 0) {
      return;
    }
    const first = workspaces.data[0];
    if (first !== undefined) {
      setWorkspaceId(first.id);
    }
  }, [workspaceId, workspaces.data]);

  useEffect(() => {
    if (projectId !== null || projects.data === undefined || projects.data.length === 0) {
      return;
    }
    const first = projects.data[0];
    if (first !== undefined) {
      setProjectId(first.id);
      if (workspaceId !== null) {
        void writeActiveProjectId(first.id, workspaceId);
      }
    }
  }, [projectId, projects.data, workspaceId]);

  const selectProject = useCallback(async (nextProjectId: string, nextWorkspaceId: string) => {
    setProjectId(nextProjectId);
    setWorkspaceId(nextWorkspaceId);
    await writeActiveProjectId(nextProjectId, nextWorkspaceId);
  }, []);

  const selectWorkspace = useCallback(async (nextWorkspaceId: string) => {
    setWorkspaceId(nextWorkspaceId);
    setProjectId(null);
    await SecureStore.setItemAsync(WORKSPACE_KEY, nextWorkspaceId);
    await SecureStore.deleteItemAsync(PROJECT_KEY);
  }, []);

  return {
    projectId,
    workspaceId,
    workspaces: workspaces.data ?? [],
    projects: projects.data ?? [],
    selectProject,
    selectWorkspace,
    isLoading: workspaces.isLoading || (workspaceId !== null && projects.isLoading),
  };
}
