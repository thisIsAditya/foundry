import type { ConversationBlock, ConversationMessage } from '@foundry/domain';
import { color } from '@foundry/ui-native';
import { Link } from 'expo-router';
import { Text, View } from 'react-native';

import { screen } from '../lib/styles';

function BlockView({ block }: { block: ConversationBlock }) {
  switch (block.kind) {
    case 'concise_answer':
      return <Text style={screen.body}>{block.text}</Text>;
    case 'cofounder_turn':
      return (
        <View style={screen.card}>
          <Text style={screen.muted}>{block.interactionType}</Text>
          <Text style={screen.body}>{block.explanation}</Text>
          {block.interpretation === undefined || block.interpretation.length === 0 ? null : (
            <Text style={screen.muted}>{block.interpretation}</Text>
          )}
          {block.recommendation === undefined || block.recommendation.length === 0 ? null : (
            <Text style={screen.body}>Recommendation: {block.recommendation}</Text>
          )}
          {block.uncertainty.length === 0 ? null : (
            <Text style={screen.muted}>{block.uncertainty}</Text>
          )}
        </View>
      );
    case 'cited_finding':
      return (
        <View style={screen.card}>
          <Text style={screen.muted}>Cited finding</Text>
          <Text style={screen.body}>{block.text}</Text>
          <Link href="/(app)/evidence" style={{ color: color.statusInfo }}>
            Open evidence
          </Link>
        </View>
      );
    case 'assumption_card':
      return (
        <View style={screen.card}>
          <Text style={screen.muted}>Assumption — not a fact</Text>
          <Text style={screen.body}>{block.text}</Text>
        </View>
      );
    case 'proposed_plan_change':
      return (
        <View style={screen.card}>
          <Text style={screen.muted}>Proposed plan change</Text>
          <Link href="/(app)/plan" style={{ color: color.statusInfo }}>
            Review the plan
          </Link>
        </View>
      );
    case 'research_plan':
    case 'job_request':
      return (
        <View style={screen.card}>
          <Text style={screen.muted}>Job</Text>
          <Link href={`/(app)/sprint/${block.jobId}`} style={{ color: color.statusInfo }}>
            Open job
          </Link>
        </View>
      );
    case 'founder_task':
      return (
        <View style={screen.card}>
          <Text style={screen.muted}>Founder task</Text>
          <Link href={`/(app)/task/${block.founderTaskId}`} style={{ color: color.statusInfo }}>
            Open task
          </Link>
        </View>
      );
    case 'draft_action':
      return (
        <View style={screen.card}>
          <Text style={screen.muted}>Draft help</Text>
          <Text style={screen.body}>{block.text}</Text>
        </View>
      );
    case 'decision_card':
      return (
        <View style={screen.card}>
          <Text style={screen.muted}>Decision</Text>
          <Text style={screen.body}>{block.text}</Text>
        </View>
      );
    case 'blocker':
      return (
        <View style={screen.card}>
          <Text style={screen.muted}>Blocked</Text>
          <Text style={screen.body}>{block.text}</Text>
        </View>
      );
  }
}

export function ConversationMessageView({ message }: { message: ConversationMessage }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={screen.muted}>{message.actor === 'founder' ? 'You' : 'Co-founder'}</Text>
      {message.blocks.length === 0 ? <Text style={screen.body}>{message.text}</Text> : null}
      {message.blocks.map((block, index) => (
        <BlockView key={`${message.id}-${String(index)}`} block={block} />
      ))}
    </View>
  );
}
