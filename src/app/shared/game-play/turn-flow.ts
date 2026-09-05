/** Shared turn-flow shape used by both game engines. */
export interface TurnFlowState {
  status: 'in_progress' | 'finished';
  currentTurn: { throws: readonly unknown[] } | null;
  history: readonly unknown[];
}

export function canUndo(state: TurnFlowState): boolean {
  if (state.status === 'finished') return state.history.length > 0;
  return (state.currentTurn?.throws.length ?? 0) > 0 || state.history.length > 0;
}

export function canEndTurn(state: TurnFlowState): boolean {
  return state.status === 'in_progress' && (state.currentTurn?.throws.length ?? 0) > 0;
}
