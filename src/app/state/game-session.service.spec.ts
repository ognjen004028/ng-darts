import { TestBed } from '@angular/core/testing';
import { Player } from '../domain/models/player';
import { GameSessionService } from './game-session.service';

describe('GameSessionService', () => {
  let service: GameSessionService;

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
    const players: Player[] = [
      { id: 'p1', name: 'Ada' },
      { id: 'p2', name: 'Grace' },
    ];

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
});
