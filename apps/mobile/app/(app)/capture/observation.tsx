import { BusinessModelSectionKeys } from '@foundry/domain';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useActiveProject } from '../../../lib/active-project';
import { addPendingDraft } from '../../../lib/offline-drafts';
import { screen } from '../../../lib/styles';
import { useTRPC } from '../../../lib/trpc';

export default function ObservationCaptureScreen() {
  const { founderTaskId } = useLocalSearchParams<{ founderTaskId?: string }>();
  const { projectId } = useActiveProject();
  const trpc = useTRPC();
  const idempotencyKey = useRef(crypto.randomUUID());
  const [summary, setSummary] = useState('');
  const [sectionKey, setSectionKey] = useState<
    (typeof BusinessModelSectionKeys)[number] | undefined
  >();
  const [pendingSync, setPendingSync] = useState(false);
  const record = useMutation(trpc.evidence.recordObservation.mutationOptions());
  const complete = useMutation(trpc.founderTask.complete.mutationOptions());

  if (projectId === null) {
    return (
      <View style={screen.root}>
        <Text style={screen.lede}>Select a project in More first.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={screen.root}>
      <Text style={screen.title}>Field observation</Text>
      <Text style={screen.lede}>
        A dated note from the field. It stays pending until the server confirms it.
      </Text>
      <TextInput
        value={summary}
        onChangeText={setSummary}
        placeholder="What did you see?"
        style={screen.input}
        multiline
      />
      <Text style={screen.muted}>Optional section</Text>
      <View style={screen.row}>
        <Pressable onPress={() => setSectionKey(undefined)}>
          <Text
            style={sectionKey === undefined ? { ...screen.badge, fontWeight: '600' } : screen.badge}
          >
            None
          </Text>
        </Pressable>
        {BusinessModelSectionKeys.map((key) => (
          <Pressable key={key} onPress={() => setSectionKey(key)}>
            <Text
              style={sectionKey === key ? { ...screen.badge, fontWeight: '600' } : screen.badge}
            >
              {key.replaceAll('_', ' ')}
            </Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        style={screen.secondary}
        onPress={() => {
          void addPendingDraft({
            id: crypto.randomUUID(),
            kind: 'observation',
            payload: { summary, sectionKey },
            createdAt: new Date().toISOString(),
          }).then(() => setPendingSync(true));
        }}
      >
        <Text style={screen.secondaryLabel}>Save offline draft</Text>
      </Pressable>
      {pendingSync ? <Text style={screen.muted}>Saved locally · pending sync</Text> : null}
      <Pressable
        style={screen.button}
        disabled={record.isPending || summary.trim().length === 0}
        onPress={() => {
          void record
            .mutateAsync({
              projectId,
              summary: summary.trim(),
              ...(sectionKey === undefined ? {} : { sectionKey }),
              idempotencyKey: idempotencyKey.current,
            })
            .then(async (result) => {
              if (founderTaskId !== undefined) {
                await complete.mutateAsync({
                  projectId,
                  founderTaskId,
                  evidenceRef: { kind: 'evidence', id: result.id },
                  idempotencyKey: crypto.randomUUID(),
                });
              }
              idempotencyKey.current = crypto.randomUUID();
              router.back();
            })
            .catch(() => undefined);
        }}
      >
        <Text style={screen.buttonLabel}>{record.isPending ? 'Saving…' : 'Save and sync'}</Text>
      </Pressable>
      {record.error === null ? null : <Text style={screen.alert}>{record.error.message}</Text>}
    </ScrollView>
  );
}
