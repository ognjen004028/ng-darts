import { canEndTurn, canUndo, TurnFlowState } from './turn-flow';

function flow(partial: Partial<TurnFlowState>): TurnFlowState {
  return {
    status: 'in_progress',
    currentTurn: null,
    history: [],
    ...partial,
  };
}

describe('canUndo', () => {
  it('is false at the start of a game', () => {
    expect(canUndo(flow({}))).toBeFalse();
  });

  it('is true mid-turn after a dart', () => {
    expect(canUndo(flow({ currentTurn: { throws: [{}] } }))).toBeTrue();
  });

  it('is true between turns when history exists', () => {
    expect(canUndo(flow({ history: [{}] }))).toBeTrue();
  });

  it('is true after a finished game that has history', () => {
    expect(canUndo(flow({ status: 'finished', history: [{}] }))).toBeTrue();
  });

  it('is false when finished with empty history', () => {
    expect(canUndo(flow({ status: 'finished' }))).toBeFalse();
  });
});

describe('canEndTurn', () => {
  it('is false with no darts in the current turn', () => {
    expect(canEndTurn(flow({}))).toBeFalse();
  });

  it('is true when the current turn has throws', () => {
    expect(canEndTurn(flow({ currentTurn: { throws: [{}] } }))).toBeTrue();
  });

  it('is false when the game is finished', () => {
    expect(canEndTurn(flow({ status: 'finished', currentTurn: { throws: [{}] } }))).toBeFalse();
  });
});
