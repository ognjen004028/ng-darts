import { TestBed } from '@angular/core/testing';
import { Player } from '../domain/models/player';
import { GameSessionService } from './game-session.service';

describe('GameSessionService', () => {
  let service: GameSessionService;

  const players: Player[] = [
    { id: 'p1', name: 'Ada' },
    { id: 'p2', name: 'Grace' },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GameSessionService);
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
    expect(service.gameState()).toBeNull();
  });

  describe('startGame', () => {
    it('creates an x01 session with players, settings and engine state', () => {
      service.startGame('x01', players, { startingScore: 301 });

      expect(service.hasSession()).toBe(true);
      expect(service.mode()).toBe('x01');
      expect(service.players()).toEqual(players);
      expect(service.status()).toBe('in_progress');
      expect(service.winnerId()).toBeNull();

      expect(service.x01Settings()?.startingScore).toBe(301);
      expect(service.x01Settings()?.doubleIn).toBe(false);
      expect(service.x01Settings()?.doubleOut).toBe(true);
      expect(service.gameState()?.scores).toEqual({ p1: 301, p2: 301 });
    });

    it('applies default x01 settings when none are provided', () => {
      service.startGame('x01', players);

      expect(service.x01Settings()?.startingScore).toBe(501);
      expect(service.x01Settings()?.doubleOut).toBe(true);
    });

    it('creates a cricket shell session until the engine lands (Phase 4)', () => {
      service.startGame('cricket', players);

      expect(service.hasSession()).toBe(true);
      expect(service.mode()).toBe('cricket');
      expect(service.status()).toBe('in_progress');
      expect(service.x01Settings()).toBeNull();
      expect(service.gameState()).toBeNull();
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
      expect(service.gameState()).toBeNull();
    });
  });

  describe('game actions (Phase 3)', () => {
    it('applies a dart through the engine and updates the session', () => {
      service.startGame('x01', players);

      const result = service.applyThrow({ kind: 'single', target: 20 });

      expect(result?.type).toBe('success');
      expect(service.gameState()?.scores['p1']).toBe(481);
      expect(service.status()).toBe('in_progress');
    });

    it('returns null for game actions when no x01 game is active', () => {
      expect(service.applyThrow({ kind: 'miss' })).toBeNull();
      expect(service.endTurn()).toBeNull();
      expect(service.undoLastThrow()).toBeNull();
    });

    it('syncs session status and winner when the game is won', () => {
      service.startGame('x01', players);
      // Test setup: force a checkout position on the live engine state.
      const state = service.gameState();
      if (!state) throw new Error('expected game state');
      state.scores['p1'] = 40;

      const result = service.applyThrow({ kind: 'double', target: 20 });

      expect(result?.type).toBe('game_won');
      expect(service.status()).toBe('finished');
      expect(service.winnerId()).toBe('p1');
      expect(service.gameState()?.status).toBe('finished');
    });

    it('restores the session to in_progress after undoing a win', () => {
      service.startGame('x01', players);
      const state = service.gameState();
      if (!state) throw new Error('expected game state');
      state.scores['p1'] = 40;
      service.applyThrow({ kind: 'double', target: 20 });
      expect(service.status()).toBe('finished');

      service.undoLastThrow();

      expect(service.status()).toBe('in_progress');
      expect(service.winnerId()).toBeNull();
    });

    it('undoes a busted turn and hands play back to the previous player', () => {
      service.startGame('x01', players);
      const state = service.gameState();
      if (!state) throw new Error('expected game state');
      state.scores['p1'] = 20;

      expect(service.applyThrow({ kind: 'triple', target: 10 })?.type).toBe('bust');
      expect(service.gameState()?.currentPlayerIndex).toBe(1);
      expect(service.gameState()?.currentTurn).toBeNull();

      expect(service.undoLastThrow()?.type).toBe('success');
      expect(service.gameState()?.currentPlayerIndex).toBe(0);
      expect(service.gameState()?.currentTurn?.throws.length).toBe(1);
    });

    it('ends a turn early and passes play to the next player', () => {
      service.startGame('x01', players);
      service.applyThrow({ kind: 'single', target: 20 });

      expect(service.endTurn()?.type).toBe('success');
      expect(service.gameState()?.currentPlayerIndex).toBe(1);
      expect(service.gameState()?.currentTurn).toBeNull();
    });
  });
});
