import { messageForResult } from './result-message';

describe('messageForResult', () => {
  const nameOf = (id: string) => (id === 'p1' ? 'Ada' : 'Player');

  it('describes a bust', () => {
    expect(messageForResult({ type: 'bust', events: [] }, nameOf)).toContain('Bust');
  });

  it('names the winner', () => {
    expect(messageForResult({ type: 'game_won', winnerId: 'p1', events: [] }, nameOf)).toBe(
      'Ada wins!',
    );
  });

  it('reports a draw', () => {
    expect(messageForResult({ type: 'draw', events: [] }, nameOf)).toBe('Draw!');
  });

  it('passes through an invalid reason', () => {
    expect(messageForResult({ type: 'invalid', reason: 'Nope' }, nameOf)).toBe('Nope');
  });

  it('clears on success', () => {
    expect(messageForResult({ type: 'success', events: [] }, nameOf)).toBeNull();
  });
});
