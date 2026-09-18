import { messageForResult } from './result-message';

describe('messageForResult', () => {
  const nameOf = (id: string) => (id === 'p1' ? 'Ada' : 'Player');

  it('describes a bust', () => {
    expect(messageForResult({ type: 'bust', events: [] }, nameOf)).toContain('Bust');
  });

  it('does not write a win into the message line', () => {
    expect(messageForResult({ type: 'game_won', winnerId: 'p1', events: [] }, nameOf)).toBeNull();
  });

  it('does not write a draw into the message line', () => {
    expect(messageForResult({ type: 'draw', events: [] }, nameOf)).toBeNull();
  });

  it('passes through an invalid reason', () => {
    expect(messageForResult({ type: 'invalid', reason: 'Nope' }, nameOf)).toBe('Nope');
  });

  it('clears on success', () => {
    expect(messageForResult({ type: 'success', events: [] }, nameOf)).toBeNull();
  });
});
