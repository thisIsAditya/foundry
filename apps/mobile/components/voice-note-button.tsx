import { useMutation } from '@tanstack/react-query';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import { screen } from '../lib/styles';
import { useTRPC } from '../lib/trpc';
import { uploadLocalUri } from '../lib/upload-source';

export function VoiceNoteButton({
  projectId,
  onUploaded,
}: {
  projectId: string;
  onUploaded: (sourceId: string) => void;
}) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const trpc = useTRPC();
  const intent = useMutation(trpc.evidence.createUploadIntent.mutationOptions());
  const confirm = useMutation(trpc.evidence.confirmUpload.mutationOptions());

  async function toggle(): Promise<void> {
    if (recording) {
      await recorder.stop();
      setRecording(false);
      const uri = recorder.uri;
      if (uri === null || uri === undefined) {
        setStatus('No recording was saved.');
        return;
      }
      try {
        const sourceId = await uploadLocalUri({
          projectId,
          uri,
          filename: 'voice-note.m4a',
          mimeType: 'audio/mp4',
          kind: 'voice_note',
          createIntent: (body) => intent.mutateAsync(body),
          confirm: (body) => confirm.mutateAsync(body),
        });
        onUploaded(sourceId);
        setStatus('Voice note uploaded. Send to attach it.');
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Could not upload the voice note.');
      }
      return;
    }
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setStatus('Microphone permission is required for voice notes.');
      return;
    }
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setRecording(true);
    setStatus('Recording… tap again to stop and upload.');
  }

  return (
    <>
      <Pressable style={screen.secondary} onPress={() => void toggle()}>
        <Text style={screen.secondaryLabel}>
          {recording ? 'Stop voice note' : 'Record voice note'}
        </Text>
      </Pressable>
      {status === null ? null : <Text style={screen.muted}>{status}</Text>}
    </>
  );
}
