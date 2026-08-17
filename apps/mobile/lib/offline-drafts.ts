import * as SecureStore from 'expo-secure-store';

export type PendingDraftKind = 'interview' | 'wtp' | 'observation';

export type PendingDraft = {
  id: string;
  kind: PendingDraftKind;
  payload: unknown;
  createdAt: string;
};

const KEY = 'foundry.pending-drafts';

export async function listPendingDrafts(): Promise<PendingDraft[]> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (raw === null) {
    return [];
  }
  try {
    return JSON.parse(raw) as PendingDraft[];
  } catch {
    return [];
  }
}

export async function addPendingDraft(draft: PendingDraft): Promise<void> {
  const current = await listPendingDrafts();
  await SecureStore.setItemAsync(KEY, JSON.stringify([draft, ...current]));
}

export async function removePendingDraft(id: string): Promise<void> {
  const current = await listPendingDrafts();
  await SecureStore.setItemAsync(KEY, JSON.stringify(current.filter((item) => item.id !== id)));
}
