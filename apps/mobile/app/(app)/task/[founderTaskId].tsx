import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useActiveProject } from '../../../lib/active-project';
import { screen } from '../../../lib/styles';
import { captureHref, primaryCaptureKind } from '../../../lib/task-capture';
import { useTRPC } from '../../../lib/trpc';

const CAPTURE_LABEL: Record<string, string> = {
  interview: 'Open interview capture',
  wtp: 'Open payment capture',
  observation: 'Open observation capture',
};

export default function FounderTaskScreen() {
  const { founderTaskId } = useLocalSearchParams<{ founderTaskId: string }>();
  const { projectId } = useActiveProject();
  const trpc = useTRPC();
  const task = useQuery({
    ...trpc.founderTask.get.queryOptions({
      projectId: projectId ?? '00000000-0000-4000-8000-000000000000',
      founderTaskId: founderTaskId ?? '00000000-0000-4000-8000-000000000000',
    }),
    enabled: projectId !== null && founderTaskId !== undefined,
  });
  const helpKey = useRef(crypto.randomUUID());
  const [reason, setReason] = useState('');
  const help = useMutation(trpc.founderTask.requestHelp.mutationOptions());
  const skip = useMutation(trpc.founderTask.skip.mutationOptions());
  const defer = useMutation(trpc.founderTask.defer.mutationOptions());
  const item = task.data;
  const capture = item === undefined ? null : primaryCaptureKind(item);

  if (projectId === null || founderTaskId === undefined) {
    return (
      <View style={screen.root}>
        <Text style={screen.lede}>Select a project in More first.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={screen.root}>
      <Text style={screen.title}>{item?.title ?? 'Task'}</Text>
      <Text style={screen.lede}>{item?.explanation ?? 'Loading…'}</Text>
      {task.isError ? <Text style={screen.alert}>{task.error.message}</Text> : null}
      {item === undefined ? null : (
        <>
          <Text style={screen.muted}>{item.status.replaceAll('_', ' ')}</Text>
          <Text style={screen.body}>{item.evidenceSchema.description}</Text>
          {item.preparation.script === undefined ? null : (
            <Text style={screen.muted}>{item.preparation.script}</Text>
          )}
          {capture === null ? null : (
            <Link href={captureHref(capture, founderTaskId)} style={screen.button}>
              <Text style={screen.buttonLabel}>{CAPTURE_LABEL[capture]}</Text>
            </Link>
          )}
          <Pressable
            style={screen.secondary}
            onPress={() =>
              void help.mutateAsync({
                projectId,
                founderTaskId,
                idempotencyKey: helpKey.current,
              })
            }
          >
            <Text style={screen.secondaryLabel}>Ask the co-founder for help</Text>
          </Pressable>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Reason to defer or skip"
            style={screen.input}
          />
          <Pressable
            style={screen.secondary}
            disabled={reason.trim().length === 0}
            onPress={() =>
              void defer.mutateAsync({
                projectId,
                founderTaskId,
                reason: reason.trim(),
                idempotencyKey: crypto.randomUUID(),
              })
            }
          >
            <Text style={screen.secondaryLabel}>Defer</Text>
          </Pressable>
          <Pressable
            style={screen.secondary}
            disabled={reason.trim().length === 0}
            onPress={() =>
              void skip.mutateAsync({
                projectId,
                founderTaskId,
                reason: reason.trim(),
                idempotencyKey: crypto.randomUUID(),
              })
            }
          >
            <Text style={screen.secondaryLabel}>Skip this task</Text>
          </Pressable>
          {help.error === null ? null : <Text style={screen.alert}>{help.error.message}</Text>}
        </>
      )}
    </ScrollView>
  );
}
