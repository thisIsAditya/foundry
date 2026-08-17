import type { JobBoardView } from '@foundry/api-contracts';
import { color } from '@foundry/ui-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useActiveProject } from '../../lib/active-project';
import { screen } from '../../lib/styles';
import { useTRPC } from '../../lib/trpc';

const LISTS: { view: JobBoardView; label: string }[] = [
  { view: 'needs_me', label: 'Needs me' },
  { view: 'running', label: 'Running now' },
  { view: 'waiting_for_research', label: 'Waiting for research' },
  { view: 'needs_review', label: 'Needs review' },
  { view: 'completed', label: 'Completed' },
  { view: 'blocked', label: 'Blocked' },
];

export default function WorkScreen() {
  const { projectId } = useActiveProject();
  const [view, setView] = useState<JobBoardView>('needs_me');
  const trpc = useTRPC();
  const approveKey = useRef(crypto.randomUUID());
  const jobs = useQuery({
    ...trpc.job.list.queryOptions({
      projectId: projectId ?? '00000000-0000-4000-8000-000000000000',
      view,
    }),
    enabled: projectId !== null,
  });
  const tasks = useQuery({
    ...trpc.founderTask.list.queryOptions({
      projectId: projectId ?? '00000000-0000-4000-8000-000000000000',
    }),
    enabled: projectId !== null && view === 'needs_me',
  });
  const approvals = useQuery({
    ...trpc.approval.list.queryOptions({
      projectId: projectId ?? '00000000-0000-4000-8000-000000000000',
    }),
    enabled: projectId !== null && view === 'blocked',
  });
  const approve = useMutation(trpc.approval.approve.mutationOptions());

  if (projectId === null) {
    return (
      <View style={screen.root}>
        <Text style={screen.lede}>Select a project in More first.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={screen.root}>
      <Text style={screen.title}>Work</Text>
      <View style={screen.row}>
        {LISTS.map((item) => (
          <Pressable key={item.view} onPress={() => setView(item.view)}>
            <Text
              style={
                view === item.view ? { ...screen.badge, color: color.statusInfo } : screen.badge
              }
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {jobs.isError ? <Text style={screen.alert}>{jobs.error.message}</Text> : null}
      {(jobs.data ?? []).map((job) => (
        <Link key={job.id} href={`/(app)/sprint/${job.id}`} style={screen.card}>
          <Text style={screen.cardTitle}>{job.objective}</Text>
          <Text style={screen.muted}>
            {job.status.replaceAll('_', ' ')} · {job.roleLabel ?? job.jobKind}
          </Text>
        </Link>
      ))}
      {view === 'needs_me'
        ? (tasks.data ?? []).map((task) => (
            <Link key={task.id} href={`/(app)/task/${task.id}`} style={screen.card}>
              <Text style={screen.cardTitle}>{task.title}</Text>
              <Text style={screen.muted}>{task.explanation}</Text>
            </Link>
          ))
        : null}
      {view === 'blocked'
        ? (approvals.data ?? []).map((item) => (
            <View key={item.id} style={screen.card}>
              <Text style={screen.body}>{item.actionType}</Text>
              <Text style={screen.muted}>{item.status}</Text>
              {item.status === 'pending' ? (
                <Pressable
                  style={screen.button}
                  onPress={() =>
                    void approve
                      .mutateAsync({
                        projectId,
                        approvalId: item.id,
                        expectedPayloadHash: item.payloadHash,
                        idempotencyKey: approveKey.current,
                      })
                      .then(() => {
                        approveKey.current = crypto.randomUUID();
                        void approvals.refetch();
                      })
                  }
                >
                  <Text style={screen.buttonLabel}>
                    {approve.isPending ? 'Approving…' : 'Approve'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ))
        : null}
    </ScrollView>
  );
}
