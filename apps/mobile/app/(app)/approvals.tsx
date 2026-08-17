import { color } from '@foundry/ui-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTRPC } from '../../lib/trpc';

export default function ApprovalsScreen() {
  const trpc = useTRPC();
  const [projectId, setProjectId] = useState('');
  const idempotencyKey = useRef(crypto.randomUUID());
  const enabled = projectId.length > 10;
  const list = useQuery({
    ...trpc.approval.list.queryOptions({ projectId }),
    enabled,
  });
  const approve = useMutation(trpc.approval.approve.mutationOptions());

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Approvals</Text>
      <Text style={styles.body}>
        Approve or reject side effects on a live round trip. Actions are not queued while offline.
      </Text>
      <TextInput
        value={projectId}
        onChangeText={setProjectId}
        placeholder="Project id"
        autoCapitalize="none"
        style={styles.input}
      />
      {list.data?.map((item) => (
        <Pressable
          key={item.id}
          disabled={item.status !== 'pending'}
          onPress={() => {
            void approve
              .mutateAsync({
                projectId,
                approvalId: item.id,
                expectedPayloadHash: item.payloadHash,
                idempotencyKey: idempotencyKey.current,
              })
              .then(() => {
                idempotencyKey.current = crypto.randomUUID();
                void list.refetch();
              });
          }}
        >
          <Text style={styles.item}>
            {item.actionType} · {item.status}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface, padding: 24, gap: 12 },
  title: { color: color.text, fontSize: 22, fontWeight: '600' },
  body: { color: color.textMuted, fontSize: 16, lineHeight: 24 },
  input: {
    borderColor: color.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    color: color.text,
  },
  item: { color: color.text, fontSize: 16, paddingVertical: 8 },
});
