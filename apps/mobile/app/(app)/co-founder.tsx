import { SendConversationInputSchema } from '@foundry/api-contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { ConversationMessageView } from '../../components/conversation-message-view';
import { useActiveProject } from '../../lib/active-project';
import { screen } from '../../lib/styles';
import { useTRPC } from '../../lib/trpc';
import { VoiceNoteButton } from '../../components/voice-note-button';

const PROMPTS = ['The problem', 'My customer', 'Pricing', 'What to build first'];

export default function CofounderScreen() {
  const { projectId } = useActiveProject();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [sourceId, setSourceId] = useState<string | undefined>();
  const idempotencyKey = useRef(crypto.randomUUID());
  const history = useQuery({
    ...trpc.conversation.list.queryOptions({
      projectId: projectId ?? '00000000-0000-4000-8000-000000000000',
      limit: 40,
    }),
    enabled: projectId !== null,
  });
  const send = useMutation(
    trpc.conversation.send.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: trpc.conversation.list.queryKey() });
      },
    }),
  );

  if (projectId === null) {
    return (
      <View style={screen.root}>
        <Text style={screen.lede}>Select a project in More first.</Text>
      </View>
    );
  }

  const chronological = [...(history.data?.items ?? [])].reverse();

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={screen.root}>
        <Text style={screen.title}>Co-founder</Text>
        <Text style={screen.lede}>Same conversation as web. Cards carry the material work.</Text>
        {history.isError ? <Text style={screen.alert}>{history.error.message}</Text> : null}
        {chronological.map((message) => (
          <ConversationMessageView key={message.id} message={message} />
        ))}
      </ScrollView>
      <View style={{ padding: 16, gap: 8 }}>
        <View style={screen.row}>
          {PROMPTS.map((prompt) => (
            <Pressable key={prompt} onPress={() => setText((current) => current || `${prompt}: `)}>
              <Text style={screen.badge}>{prompt}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Message your co-founder"
          style={screen.input}
          multiline
        />
        <VoiceNoteButton
          projectId={projectId}
          onUploaded={(id) => {
            setSourceId(id);
            setText((current) =>
              current.length > 0 ? current : 'Please transcribe this voice note.',
            );
          }}
        />
        <Pressable
          style={screen.button}
          disabled={send.isPending || text.trim().length === 0}
          onPress={() => {
            const input = SendConversationInputSchema.parse({
              projectId,
              text,
              ...(sourceId === undefined ? {} : { sourceId }),
              idempotencyKey: idempotencyKey.current,
            });
            void send
              .mutateAsync(input)
              .then(() => {
                idempotencyKey.current = crypto.randomUUID();
                setText('');
                setSourceId(undefined);
              })
              .catch(() => undefined);
          }}
        >
          <Text style={screen.buttonLabel}>{send.isPending ? 'Thinking…' : 'Send'}</Text>
        </Pressable>
        {send.error === null ? null : <Text style={screen.alert}>{send.error.message}</Text>}
      </View>
    </View>
  );
}
