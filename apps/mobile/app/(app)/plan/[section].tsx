import { BusinessModelSectionKeySchema } from '@foundry/domain';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useActiveProject } from '../../../lib/active-project';
import { screen } from '../../../lib/styles';
import { useTRPC } from '../../../lib/trpc';

export default function PlanSectionScreen() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const parsed = BusinessModelSectionKeySchema.safeParse(section);
  const key = parsed.success ? parsed.data : 'context';
  const { projectId } = useActiveProject();
  const trpc = useTRPC();
  const detail = useQuery({
    ...trpc.pack.getBusinessModelSection.queryOptions({
      projectId: projectId ?? '00000000-0000-4000-8000-000000000000',
      key,
    }),
    enabled: projectId !== null,
  });
  const revisions = useQuery({
    ...trpc.pack.listRevisions.queryOptions({
      projectId: projectId ?? '00000000-0000-4000-8000-000000000000',
    }),
    enabled: projectId !== null,
  });
  const acceptKey = useRef(crypto.randomUUID());
  const acceptAllKey = useRef(crypto.randomUUID());
  const [reason, setReason] = useState('');
  const [skipped, setSkipped] = useState<string[] | null>(null);
  const accept = useMutation(trpc.pack.acceptSection.mutationOptions());
  const acceptAll = useMutation(trpc.pack.acceptAllSafeSections.mutationOptions());
  const reject = useMutation(trpc.pack.rejectRevision.mutationOptions());
  const card = detail.data?.card;
  const draft = (revisions.data ?? []).find((item) => item.status === 'draft');

  if (projectId === null) {
    return (
      <View style={screen.root}>
        <Text style={screen.lede}>Select a project in More first.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={screen.root}>
      <Text style={screen.title}>{card?.title ?? key}</Text>
      <Text style={screen.lede}>{card?.summary || 'Labeled assumptions until research lands.'}</Text>
      {detail.isError ? <Text style={screen.alert}>{detail.error.message}</Text> : null}
      <View style={screen.card}>
        <Text style={screen.muted}>Known</Text>
        {(card?.knownFacts ?? []).map((fact) => (
          <Text key={fact} style={screen.body}>
            {fact}
          </Text>
        ))}
        <Text style={screen.muted}>Assumptions</Text>
        {(card?.assumptions ?? []).map((item) => (
          <Text key={item} style={screen.body}>
            {item}
          </Text>
        ))}
        <Text style={screen.muted}>{card?.citations.length ?? 0} citations</Text>
        <Link href="/(app)/evidence" style={{ color: '#2563eb' }}>
          Open evidence
        </Link>
      </View>
      {draft === undefined ? null : (
        <>
          <Pressable
            style={screen.button}
            onPress={() =>
              void accept.mutateAsync({
                projectId,
                revisionId: draft.id,
                sectionKey: key,
                expectedRevision: draft.id,
                idempotencyKey: acceptKey.current,
              })
            }
          >
            <Text style={screen.buttonLabel}>
              {accept.isPending ? 'Accepting…' : 'Accept this section'}
            </Text>
          </Pressable>
          <Pressable
            style={screen.secondary}
            onPress={() =>
              void acceptAll
                .mutateAsync({
                  projectId,
                  revisionId: draft.id,
                  expectedRevision: draft.id,
                  idempotencyKey: acceptAllKey.current,
                })
                .then((result) => setSkipped(result.skippedUnsafeKeys))
            }
          >
            <Text style={screen.secondaryLabel}>
              {acceptAll.isPending ? 'Accepting safe sections…' : 'Accept all safe sections'}
            </Text>
          </Pressable>
          {skipped === null ? null : (
            <Text style={screen.muted}>
              Skipped money-sensitive sections: {skipped.join(', ') || 'none'}
            </Text>
          )}
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Reason to reject this revision"
            style={screen.input}
          />
          <Pressable
            style={screen.secondary}
            disabled={reason.trim().length === 0}
            onPress={() =>
              void reject.mutateAsync({
                projectId,
                revisionId: draft.id,
                reason: reason.trim(),
                idempotencyKey: crypto.randomUUID(),
              })
            }
          >
            <Text style={screen.secondaryLabel}>Reject revision</Text>
          </Pressable>
        </>
      )}
      {accept.error === null ? null : <Text style={screen.alert}>{accept.error.message}</Text>}
    </ScrollView>
  );
}
