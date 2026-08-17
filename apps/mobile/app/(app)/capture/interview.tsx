import { InterviewParticipantTypes } from '@foundry/domain';
import { useMutation } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { VoiceNoteButton } from '../../../components/voice-note-button';
import { useActiveProject } from '../../../lib/active-project';
import { addPendingDraft } from '../../../lib/offline-drafts';
import { screen } from '../../../lib/styles';
import { useTRPC } from '../../../lib/trpc';
import { uploadLocalUri } from '../../../lib/upload-source';

export default function InterviewCaptureScreen() {
  const { founderTaskId } = useLocalSearchParams<{ founderTaskId?: string }>();
  const { projectId } = useActiveProject();
  const trpc = useTRPC();
  const idempotencyKey = useRef(crypto.randomUUID());
  const [participantType, setParticipantType] =
    useState<(typeof InterviewParticipantTypes)[number]>('non_friend');
  const [label, setLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [quotes, setQuotes] = useState('');
  const [sourceId, setSourceId] = useState<string | undefined>();
  const [pendingSync, setPendingSync] = useState(false);
  const [attachStatus, setAttachStatus] = useState<string | null>(null);
  const add = useMutation(trpc.evidence.addInterview.mutationOptions());
  const complete = useMutation(trpc.founderTask.complete.mutationOptions());
  const intent = useMutation(trpc.evidence.createUploadIntent.mutationOptions());
  const confirm = useMutation(trpc.evidence.confirmUpload.mutationOptions());

  if (projectId === null) {
    return (
      <View style={screen.root}>
        <Text style={screen.lede}>Select a project in More first.</Text>
      </View>
    );
  }
  const activeProjectId = projectId;

  async function attachUri(uri: string, filename: string, mimeType: string): Promise<void> {
    const uploaded = await uploadLocalUri({
      projectId: activeProjectId,
      uri,
      filename,
      mimeType,
      kind: 'upload',
      createIntent: (body) => intent.mutateAsync(body),
      confirm: (body) => confirm.mutateAsync(body),
    });
    setSourceId(uploaded);
    setAttachStatus('Attachment uploaded. It stays pending until you save.');
  }

  return (
    <ScrollView contentContainerStyle={screen.root}>
      <Text style={screen.title}>Interview capture</Text>
      <Text style={screen.lede}>
        Friends and family do not count as independent validation. The note stays pending until the
        server confirms it.
      </Text>
      {InterviewParticipantTypes.map((type) => (
        <Pressable key={type} onPress={() => setParticipantType(type)}>
          <Text style={screen.badge}>
            {type === participantType ? '● ' : '○ '}
            {type.replaceAll('_', ' ')}
          </Text>
        </Pressable>
      ))}
      {participantType === 'non_friend' ? null : (
        <Text style={screen.muted}>This will be stored, but it is not independent proof.</Text>
      )}
      <TextInput
        value={label}
        onChangeText={setLabel}
        placeholder="Optional participant label"
        style={screen.input}
      />
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes"
        style={screen.input}
        multiline
      />
      <TextInput
        value={quotes}
        onChangeText={setQuotes}
        placeholder="One quote per line"
        style={screen.input}
        multiline
      />
      <VoiceNoteButton projectId={projectId} onUploaded={setSourceId} />
      <Pressable
        style={screen.secondary}
        onPress={() => {
          void ImagePicker.launchImageLibraryAsync({ quality: 0.8 }).then(async (picked) => {
            const asset = picked.assets?.[0];
            if (picked.canceled || asset === undefined) {
              return;
            }
            try {
              await attachUri(
                asset.uri,
                asset.fileName ?? 'photo.jpg',
                asset.mimeType ?? 'image/jpeg',
              );
            } catch (error) {
              setAttachStatus(
                error instanceof Error ? error.message : 'Could not upload the photo.',
              );
            }
          });
        }}
      >
        <Text style={screen.secondaryLabel}>Attach photo</Text>
      </Pressable>
      <Pressable
        style={screen.secondary}
        onPress={() => {
          void DocumentPicker.getDocumentAsync({
            type: ['application/pdf', 'text/plain', 'text/markdown'],
          }).then(async (picked) => {
            if (picked.canceled) {
              return;
            }
            const asset = picked.assets[0];
            if (asset === undefined) {
              return;
            }
            try {
              await attachUri(asset.uri, asset.name, asset.mimeType ?? 'application/pdf');
            } catch (error) {
              setAttachStatus(
                error instanceof Error ? error.message : 'Could not upload the file.',
              );
            }
          });
        }}
      >
        <Text style={screen.secondaryLabel}>Attach document</Text>
      </Pressable>
      {attachStatus === null ? null : <Text style={screen.muted}>{attachStatus}</Text>}
      <Pressable
        style={screen.secondary}
        onPress={() => {
          void addPendingDraft({
            id: crypto.randomUUID(),
            kind: 'interview',
            payload: { participantType, label, notes, quotes },
            createdAt: new Date().toISOString(),
          }).then(() => setPendingSync(true));
        }}
      >
        <Text style={screen.secondaryLabel}>Save offline draft</Text>
      </Pressable>
      {pendingSync ? <Text style={screen.muted}>Saved locally · pending sync</Text> : null}
      <Pressable
        style={screen.button}
        disabled={add.isPending}
        onPress={() => {
          const lines = quotes
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0);
          if (lines.length === 0) {
            return;
          }
          void add
            .mutateAsync({
              projectId,
              participantType,
              consent: { given: true },
              quotes: lines,
              ...(label.length === 0 ? {} : { label }),
              ...(notes.length === 0 ? {} : { notes }),
              ...(sourceId === undefined ? {} : { sourceId }),
              idempotencyKey: idempotencyKey.current,
            })
            .then(async (result) => {
              if (founderTaskId !== undefined) {
                await complete.mutateAsync({
                  projectId,
                  founderTaskId,
                  evidenceRef: { kind: 'evidence', id: result.interview.id },
                  idempotencyKey: crypto.randomUUID(),
                });
              }
              idempotencyKey.current = crypto.randomUUID();
              router.back();
            })
            .catch(() => undefined);
        }}
      >
        <Text style={screen.buttonLabel}>{add.isPending ? 'Saving…' : 'Save and sync'}</Text>
      </Pressable>
      {add.error === null ? null : <Text style={screen.alert}>{add.error.message}</Text>}
    </ScrollView>
  );
}
