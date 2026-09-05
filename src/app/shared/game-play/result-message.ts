import { CricketResult } from '../../domain/cricket/cricket-engine';
import { X01Result } from '../../domain/x01/x01-engine';

export function messageForResult(
  result: X01Result | CricketResult,
  playerName: (id: string) => string,
): string | null {
  switch (result.type) {
    case 'bust':
      return 'Bust — turn reverted, next player up.';
    case 'game_won':
      return `${playerName(result.winnerId)} wins!`;
    case 'invalid':
      return result.reason;
    case 'success':
      return null;
    case 'draw':
      return 'Draw!';
  }
}
