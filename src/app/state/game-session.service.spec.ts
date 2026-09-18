import { TestBed } from '@angular/core/testing';
import { Player } from '../domain/models/player';
import { GameSessionService } from './game-session.service';
import { SESSION_STORAGE_KEY } from './session-persist';
import { cricketCloseAll, x01BustFrom301, x01CheckoutFrom301 } from '../../testing/darts';
import { applyDarts, clearPersistedHistory, clearPersistedSession } from '../../testing/session';
import { MatchHistoryService } from './match-history.service';

describe('GameSessionService', () => {
  let service: GameSessionService;
  let history: MatchHistoryService;

  const players: Player[] = [
    { id: 'p1', name: 'Ada' },
    { id: 'p2', name: 'Grace' },
  ];

  beforeEach(() => {
    clearPersistedSession();
    clearPersistedHistory();
    TestBed.configureTestingModule({});
    service = TestBed.inject(GameSessionService);
    history = TestBed.inject(MatchHistoryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('starts without a session', () => {
    expect(service.hasSession()).toBe(false);
    expect(service.players()).toEqual([]);
    expect(service.mode()).toBeNull();
    expect(service.status()).toBeNull();
    expect(service.x01Settings()).toBeNull();
    expect(service.cricketSettings()).toBeNull();
    expect(service.x01GameState()).toBeNull();
    expect(service.cricketGameState()).toBeNull();
  });

  describe('startGame', () => {
    it('creates an x01 session with players, settings and engine state', () => {
      service.startGame('x01', players, { startingScore: 301 });

      expect(service.hasSession()).toBe(true);
      expect(service.mode()).toBe('x01');
      expect(service.players()).toEqual([
        { id: 'p1', name: 'Ada', order: 0 },
        { id: 'p2', name: 'Grace', order: 1 },
      ]);
      expect(service.status()).toBe('in_progress');
      expect(service.winnerId()).toBeNull();

      expect(service.x01Settings()?.startingScore).toBe(301);
      expect(service.x01Settings()?.doubleIn).toBe(false);
      expect(service.x01Settings()?.doubleOut).toBe(true);
      expect(service.x01GameState()?.scores).toEqual({ p1: 301, p2: 301 });
      expect(service.cricketGameState()).toBeNull();
    });

    it('applies default x01 settings when none are provided', () => {
      service.startGame('x01', players);

      expect(service.x01Settings()?.startingScore).toBe(501);
      expect(service.x01Settings()?.doubleOut).toBe(true);
    });

    it('creates a cricket session with engine state (Phase 4)', () => {
      service.startGame('cricket', players);

      expect(service.hasSession()).toBe(true);
      expect(service.mode()).toBe('cricket');
      expect(service.status()).toBe('in_progress');
      expect(service.x01Settings()).toBeNull();
      expect(service.x01GameState()).toBeNull();
      expect(service.cricketSettings()?.targets).toEqual([20, 19, 18, 17, 16, 15, 'bull']);
      expect(service.cricketGameState()?.players['p1'].points).toBe(0);
      expect(service.cricketGameState()?.players['p1'].marks['20']).toBe(0);
    });

    it('rejects starting without players', () => {
      expect(() => service.startGame('x01', [])).toThrowError(/at least one player/);
    });
  });

  describe('reset', () => {
    it('clears the active session', () => {
      service.startGame('x01', [{ id: 'p1', name: 'Ada' }]);
      expect(service.hasSession()).toBe(true);

      service.reset();

      expect(service.hasSession()).toBe(false);
      expect(service.mode()).toBeNull();
      expect(service.players()).toEqual([]);
      expect(service.x01GameState()).toBeNull();
      expect(service.cricketGameState()).toBeNull();
    });
  });

  describe('game actions (Phase 3)', () => {
    it('applies a dart through the engine and updates the session', () => {
      service.startGame('x01', players);

      const result = service.applyThrow({ kind: 'single', target: 20 });

      expect(result?.type).toBe('success');
      expect(service.x01GameState()?.scores['p1']).toBe(481);
      expect(service.status()).toBe('in_progress');
    });

    it('returns null for game actions when no game is active', () => {
      expect(service.applyThrow({ kind: 'miss' })).toBeNull();
      expect(service.endTurn()).toBeNull();
      expect(service.undoLastThrow()).toBeNull();
    });

    it('syncs session status and winner when the game is won', () => {
      service.startGame('x01', [players[0]], { startingScore: 301 });
      applyDarts(service, x01CheckoutFrom301);

      expect(service.status()).toBe('finished');
      expect(service.winnerId()).toBe('p1');
      expect(service.x01GameState()?.status).toBe('finished');
    });

    it('restores the session to in_progress after undoing a win', () => {
      service.startGame('x01', [players[0]], { startingScore: 301 });
      applyDarts(service, x01CheckoutFrom301);
      expect(service.status()).toBe('finished');

      service.undoLastThrow();

      expect(service.status()).toBe('in_progress');
      expect(service.winnerId()).toBeNull();
    });

    it('undoes a busted turn and hands play back to the previous player', () => {
      service.startGame('x01', players, { startingScore: 301 });
      applyDarts(service, x01BustFrom301);

      expect(service.x01GameState()?.currentPlayerIndex).toBe(1);
      expect(service.x01GameState()?.currentTurn).toBeNull();

      expect(service.undoLastThrow()?.type).toBe('success');
      expect(service.x01GameState()?.currentPlayerIndex).toBe(0);
      expect(service.x01GameState()?.currentTurn?.throws.length).toBe(1);
    });

    it('ends a turn early and passes play to the next player', () => {
      service.startGame('x01', players);
      service.applyThrow({ kind: 'single', target: 20 });

      expect(service.endTurn()?.type).toBe('success');
      expect(service.x01GameState()?.currentPlayerIndex).toBe(1);
      expect(service.x01GameState()?.currentTurn).toBeNull();
    });
  });

  describe('cricket game actions (Phase 4)', () => {
    it('applies a dart and updates marks', () => {
      service.startGame('cricket', players);

      const result = service.applyThrow({ kind: 'single', target: 20 }, 'p1');

      expect(result?.type).toBe('success');
      expect(service.cricketGameState()?.players['p1'].marks['20']).toBe(1);
      expect(service.status()).toBe('in_progress');
    });

    it('requires a player id for a cricket throw', () => {
      service.startGame('cricket', players);

      expect(service.applyThrow({ kind: 'single', target: 20 })?.type).toBe('invalid');
    });

    it('syncs session status and winner when cricket is won', () => {
      service.startGame('cricket', players);
      applyDarts(service, cricketCloseAll, 'p1');

      expect(service.status()).toBe('finished');
      expect(service.winnerId()).toBe('p1');
    });

    it('rejects endTurn because Cricket has no turns', () => {
      service.startGame('cricket', players);
      service.applyThrow({ kind: 'single', target: 20 }, 'p1');

      expect(service.endTurn()?.type).toBe('invalid');
    });
  });

  describe('persistence (Phase 5.2)', () => {
    it('writes the live session and restores it on a new service', () => {
      service.startGame('x01', players, { startingScore: 301 });
      service.applyThrow({ kind: 'triple', target: 20 });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const restored = TestBed.inject(GameSessionService);

      expect(restored.hasSession()).toBe(true);
      expect(restored.mode()).toBe('x01');
      expect(restored.x01GameState()?.scores['p1']).toBe(241);
    });

    it('clears storage on reset so a new service has no session', () => {
      service.startGame('x01', players);
      service.reset();

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const restored = TestBed.inject(GameSessionService);

      expect(restored.hasSession()).toBe(false);
    });

    it('drops an invalid stored payload and starts empty', () => {
      localStorage.setItem(SESSION_STORAGE_KEY, '{not json');

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const restored = TestBed.inject(GameSessionService);

      expect(restored.hasSession()).toBe(false);
      expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    });
  });

  describe('match history (Phase 5.2b)', () => {
    it('appends an x01 row when the game is won', () => {
      service.startGame('x01', [players[0]], { startingScore: 301 });
      applyDarts(service, x01CheckoutFrom301);

      expect(history.matches().length).toBe(1);
      const row = history.matches()[0];
      expect(row.mode).toBe('x01');
      expect(row.winnerId).toBe('p1');
      expect(row.players.map((player) => player.name)).toEqual(['Ada']);
      expect(row.settings).toEqual({ startingScore: 301, doubleIn: false, doubleOut: true });
    });

    it('retracts the row when undo returns a finished game to in_progress', () => {
      service.startGame('x01', [players[0]], { startingScore: 301 });
      applyDarts(service, x01CheckoutFrom301);
      expect(history.matches().length).toBe(1);

      service.undoLastThrow();

      expect(service.status()).toBe('in_progress');
      expect(history.matches().length).toBe(0);
    });

    it('appends a cricket row when the game is won', () => {
      service.startGame('cricket', players);
      applyDarts(service, cricketCloseAll, 'p1');

      expect(history.matches().length).toBe(1);
      expect(history.matches()[0].mode).toBe('cricket');
      expect(history.matches()[0].winnerId).toBe('p1');
      expect(history.matches()[0].settings).toEqual({ scoring: 'standard' });
    });

    it('appends a cricket draw with a null winner', () => {
      history.record({
        mode: 'cricket',
        players,
        winnerId: null,
      });

      expect(history.matches().length).toBe(1);
      expect(history.matches()[0].winnerId).toBeNull();
      expect(history.matches()[0].mode).toBe('cricket');
    });

    it('does not append again while the game stays finished', () => {
      service.startGame('x01', [players[0]], { startingScore: 301 });
      applyDarts(service, x01CheckoutFrom301);
      service.applyThrow({ kind: 'miss' });

      expect(history.matches().length).toBe(1);
    });

    it('keeps history when a finished session is reset', () => {
      service.startGame('x01', [players[0]], { startingScore: 301 });
      applyDarts(service, x01CheckoutFrom301);
      service.reset();

      expect(service.hasSession()).toBe(false);
      expect(history.matches().length).toBe(1);
    });

    it('keeps history when startGame replaces a finished session', () => {
      service.startGame('x01', [players[0]], { startingScore: 301 });
      applyDarts(service, x01CheckoutFrom301);
      service.startGame('cricket', players);

      expect(service.status()).toBe('in_progress');
      expect(history.matches().length).toBe(1);
      expect(history.matches()[0].mode).toBe('x01');
    });

    it('restores history on a new service', () => {
      service.startGame('x01', [players[0]], { startingScore: 301 });
      applyDarts(service, x01CheckoutFrom301);

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const restored = TestBed.inject(MatchHistoryService);

      expect(restored.matches().length).toBe(1);
      expect(restored.matches()[0].winnerId).toBe('p1');
    });
  });
});
