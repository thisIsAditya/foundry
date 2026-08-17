import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useRef } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useActiveProject } from '../../../lib/active-project';
import { screen } from '../../../lib/styles';
import { useTRPC } from '../../../lib/trpc';

export default function JobScreen() {
  const { sprintId } = useLocalSearchParams<{ sprintId: string }>();
  const { projectId } = useActiveProject();
  const trpc = useTRPC();
  const job = useQuery({
    ...trpc.job.get.queryOptions({
      projectId: projectId ?? '00000000-0000-4000-8000-000000000000',
      jobId: sprintId ?? '00000000-0000-4000-8000-000000000000',
    }),
    enabled: projectId !== null && sprintId !== undefined,
  });
  const contract = useQuery({
    ...trpc.sprint.getContract.queryOptions({
      sprintId: sprintId ?? '00000000-0000-4000-8000-000000000000',
    }),
    enabled: sprintId !== undefined,
  });
  const approveKey = useRef(crypto.randomUUID());
  const approve = useMutation(trpc.sprint.approvePlan.mutationOptions());
  const pause = useMutation(trpc.sprint.pause.mutationOptions());
  const resume = useMutation(trpc.sprint.resume.mutationOptions());
  const stop = useMutation(trpc.sprint.stop.mutationOptions());
  const retry = useMutation(trpc.job.retry.mutationOptions());
  const summary = job.data;
  const hash = contract.data?.contractHash;

  if (projectId === null || sprintId === undefined) {
    return (
      <View style={screen.root}>
        <Text style={screen.lede}>Select a project in More first.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={screen.root}>
      <Text style={screen.title}>{summary?.objective ?? 'Job'}</Text>
      {job.isLoading ? <Text style={screen.muted}>Loading job…</Text> : null}
      {job.isError ? <Text style={screen.alert}>{job.error.message}</Text> : null}
      {summary === undefined ? null : (
        <>
          <Text style={screen.lede}>{summary.whyNow ?? summary.roleLabel ?? summary.jobKind}</Text>
          <Text style={screen.muted}>
            {summary.status.replaceAll('_', ' ')} · {summary.progressPercent}% ·{' '}
            {summary.estimatedCost === undefined
              ? 'Cost unknown'
              : `${summary.estimatedCost.inputEstimate} / ${summary.estimatedCost.outputEstimate} ${summary.estimatedCost.currency}`}
          </Text>
          {summary.founderActionRequired === undefined ? null : (
            <Text style={screen.body}>{summary.founderActionRequired}</Text>
          )}
          {summary.status === 'proposed' && hash !== undefined ? (
            <Pressable
              style={screen.button}
              onPress={() =>
                void approve.mutateAsync({
                  sprintId,
                  expectedContractHash: hash,
                  idempotencyKey: approveKey.current,
                })
              }
            >
              <Text style={screen.buttonLabel}>{approve.isPending ? 'Starting…' : 'Start'}</Text>
            </Pressable>
          ) : null}
          {summary.status === 'running' ? (
            <Pressable
              style={screen.secondary}
              onPress={() =>
                void pause.mutateAsync({ sprintId, idempotencyKey: crypto.randomUUID() })
              }
            >
              <Text style={screen.secondaryLabel}>Pause</Text>
            </Pressable>
          ) : null}
          {summary.status === 'queued' || summary.status === 'blocked' ? (
            <Pressable
              style={screen.secondary}
              onPress={() =>
                void resume.mutateAsync({ sprintId, idempotencyKey: crypto.randomUUID() })
              }
            >
              <Text style={screen.secondaryLabel}>Resume</Text>
            </Pressable>
          ) : null}
          {summary.status === 'failed' ? (
            <Pressable
              style={screen.button}
              onPress={() =>
                void retry.mutateAsync({
                  projectId,
                  jobId: sprintId,
                  idempotencyKey: crypto.randomUUID(),
                })
              }
            >
              <Text style={screen.buttonLabel}>Retry</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={screen.secondary}
            onPress={() => void stop.mutateAsync({ sprintId, idempotencyKey: crypto.randomUUID() })}
          >
            <Text style={screen.secondaryLabel}>Cancel</Text>
          </Pressable>
          {approve.error === null ? null : (
            <Text style={screen.alert}>{approve.error.message}</Text>
          )}
        </>
      )}
    </ScrollView>
  );
}
