import { Message } from '@shared/api';
import { applyReaction } from './reactions';

const msg = (reactions: Message['reactions']): Message => ({
  id: 'm', channel_id: 'c', author: null, content: '', mention_everyone: false, mentions: [], mention_roles: [],
  attachments: [], reactions, created_at: '',
});
const shown = (m: Message) => (m.reactions ?? []).map(r => `${r.emoji}${r.count}${r.me ? '*' : ''}`).join(' ');
const ev = (emoji?: string, user_id?: string) => ({ channel_id: 'c', message_id: 'm', emoji, user_id });

describe('applyReaction', () => {
  it('adds, counts and marks the viewer', () => {
    let m = applyReaction(msg([]), 'MESSAGE_REACTION_ADD', ev('👍', 'bob'), 'ann');
    m = applyReaction(m, 'MESSAGE_REACTION_ADD', ev('👍', 'ann'), 'ann');
    m = applyReaction(m, 'MESSAGE_REACTION_ADD', ev('🔥', 'bob'), 'ann');
    expect(shown(m)).toBe('👍2* 🔥1');
  });

  it('a click shown at once is not counted again when its event comes', () => {
    const clicked = applyReaction(msg([{ emoji: '👍', count: 1, me: false }]), 'MESSAGE_REACTION_ADD', ev('👍', 'ann'), 'ann');
    expect(shown(applyReaction(clicked, 'MESSAGE_REACTION_ADD', ev('👍', 'ann'), 'ann'))).toBe('👍2*');
    const unclicked = applyReaction(clicked, 'MESSAGE_REACTION_REMOVE', ev('👍', 'ann'), 'ann');
    expect(shown(applyReaction(unclicked, 'MESSAGE_REACTION_REMOVE', ev('👍', 'ann'), 'ann'))).toBe('👍1');
  });

  it('removes one, an emoji or all; the last one takes the emoji away', () => {
    const m = msg([{ emoji: '👍', count: 1, me: false }, { emoji: '🔥', count: 3, me: true }]);
    expect(shown(applyReaction(m, 'MESSAGE_REACTION_REMOVE', ev('👍', 'bob'), 'ann'))).toBe('🔥3*');
    expect(shown(applyReaction(m, 'MESSAGE_REACTION_REMOVE', ev('🔥', 'bob'), 'ann'))).toBe('👍1 🔥2*');
    expect(shown(applyReaction(m, 'MESSAGE_REACTION_REMOVE_EMOJI', ev('🔥'), 'ann'))).toBe('👍1');
    expect(shown(applyReaction(m, 'MESSAGE_REACTION_REMOVE_ALL', ev(), 'ann'))).toBe('');
  });

  it('works on a message whose reactions came as null', () => {
    expect(shown(applyReaction(msg(null), 'MESSAGE_REACTION_ADD', ev('👍', 'bob'), 'ann'))).toBe('👍1');
  });
});
