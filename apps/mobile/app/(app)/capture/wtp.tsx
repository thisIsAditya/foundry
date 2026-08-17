import { WtpInstruments, WtpParticipantClasses } from '@foundry/domain';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useActiveProject } from '../../../lib/active-project';
import { addPendingDraft } from '../../../lib/offline-drafts';
import { screen } from '../../../lib/styles';
import { useTRPC } from '../../../lib/trpc';

export default function WtpCaptureScreen() {
  const { founderTaskId } = useLocalSearchParams<{ founderTaskId?: string }>();
  const { projectId } = useActiveProject();
  const trpc = useTRPC();
  const idempotencyKey = useRef(crypto.randomUUID());
  const [participantClass, setParticipantClass] =
    useState<(typeof WtpParticipantClasses)[number]>('independent_prospect');
  const [instrument, setInstrument] = useState<(typeof WtpInstruments)[number]>('deposit');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [pendingSync, setPendingSync] = useState(false);
  const record = useMutation(trpc.wtp.record.mutationOptions());
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
      <Text style={screen.title}>Payment signal</Text>
      <Text style={screen.lede}>
        Record a paid pilot, deposit, invoice, or other willingness-to-pay event.
      </Text>
      <Text style={screen.muted}>Who paid or promised?</Text>
      {WtpParticipantClasses.map((value) => (
        <Pressable key={value} onPress={() => setParticipantClass(value)}>
          <Text style={screen.badge}>
            {value === participantClass ? '● ' : '○ '}
            {value.replaceAll('_', ' ')}
          </Text>
        </Pressable>
      ))}
      {participantClass === 'independent_prospect' ? null : (
        <Text style={screen.muted}>
          Friends and known contacts are stored, not independent proof.
        </Text>
      )}
      <Text style={screen.muted}>Instrument</Text>
      {WtpInstruments.map((value) => (
        <Pressable key={value} onPress={() => setInstrument(value)}>
          <Text style={screen.badge}>
            {value === instrument ? '● ' : '○ '}
            {value.replaceAll('_', ' ')}
          </Text>
        </Pressable>
      ))}
      <TextInput
        value={amount}
        onChangeText={setAmount}
        placeholder="Amount (optional, e.g. 5000)"
        keyboardType="decimal-pad"
        style={screen.input}
      />
      <TextInput
        value={currency}
        onChangeText={(value) => setCurrency(value.toUpperCase())}
        placeholder="Currency"
        autoCapitalize="characters"
        style={screen.input}
      />
      <Pressable
        style={screen.secondary}
        onPress={() => {
          void addPendingDraft({
            id: crypto.randomUUID(),
            kind: 'wtp',
            payload: { participantClass, instrument, amount, currency },
            createdAt: new Date().toISOString(),
          }).then(() => setPendingSync(true));
        }}
      >
        <Text style={screen.secondaryLabel}>Save offline draft</Text>
      </Pressable>
      {pendingSync ? <Text style={screen.muted}>Saved locally · pending sync</Text> : null}
      <Pressable
        style={screen.button}
        disabled={record.isPending}
        onPress={() => {
          const trimmed = amount.trim();
          void record
            .mutateAsync({
              projectId,
              participantClass,
              instrument,
              ...(trimmed.length > 0 ? { amount: trimmed } : {}),
              ...(currency.length === 3 ? { currency } : {}),
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
