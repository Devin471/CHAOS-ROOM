import type { AnswerTag } from './types.js';
export * from './sound.js';
export * from './confetti.js';

/**
 * Standard Netlify Function endpoint.
 * Direct call without /api/game redirect or config.path.
 */
export const FUNCTION_URL = '/.netlify/functions/game';

export async function api(action: string, payload: any = {}): Promise<any> {
  try {
    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    });
    return await res.json();
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error connecting to game' };
  }
}

export const AVATARS = ['🦊','🐸','🐼','🐙','🦄','🐯','🐧','🦝','🤖','👽','🦖','🍕'];
export const REACTION_EMOJIS = ['🔥', '💀', '😂', '👏', '😱', '💩', '👑', '🎉'];

export const TAG_COLORS: Record<AnswerTag, string> = {
  'HILARIOUS':  '#ff6b35',
  'GENIUS':     '#7c3aed',
  'LOGICAL':    '#2563eb',
  'CREATIVE':   '#059669',
  'CHAOTIC':    '#dc2626',
  'WTF?':       '#ea580c',
  'LAZY':       '#6b7280',
  'DARK HUMOR': '#1f2937',
  'HIVEMIND':   '#0284c7',
  'SAVAGE':     '#be123c',
  'POETIC':     '#7c3aed',
  'CRINGE':     '#9f1239',
  'NEGATIVE':   '#374151',
};

export const TAG_EMOJIS: Record<AnswerTag, string> = {
  'HILARIOUS':  '😂',
  'GENIUS':     '🧠',
  'LOGICAL':    '🔬',
  'CREATIVE':   '🎨',
  'CHAOTIC':    '🌪️',
  'WTF?':       '💥',
  'LAZY':       '😴',
  'DARK HUMOR': '💀',
  'HIVEMIND':   '🤝',
  'SAVAGE':     '🗡️',
  'POETIC':     '📜',
  'CRINGE':     '😬',
  'NEGATIVE':   '❌',
};
