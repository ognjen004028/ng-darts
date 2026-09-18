import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Player } from '../../domain/models/player';
import { GameSessionService } from '../../state/game-session.service';
import { HomeComponent } from './home.component';
import { clearPersistedHistory, clearPersistedSession } from '../../../testing/session';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let session: GameSessionService;
  let router: jasmine.SpyObj<Router>;

  const players: Player[] = [{ id: 'p1', name: 'Ada' }];

  beforeEach(async () => {
    clearPersistedSession();
    clearPersistedHistory();
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        GameSessionService,
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    session = TestBed.inject(GameSessionService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('hides double in and double out when the mode is cricket', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('#x01-double-in')).toBeNull();
    expect(el.querySelector('#x01-double-out')).toBeNull();
  });

  it('shows double in and double out when the mode is x01', () => {
    component.selectedGamemode = 'x01';
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('#x01-double-in')).toBeTruthy();
    expect(el.querySelector('#x01-double-out')).toBeTruthy();
  });

  it('does not start a session or navigate without players', () => {
    component.players = [];
    component.startGame();

    expect(session.hasSession()).toBe(false);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('starts an x01 session and navigates to the x01 game route', () => {
    component.selectedGamemode = 'x01';
    component.selectedX01Score = 301;
    component.players = players;

    component.startGame();

    expect(session.hasSession()).toBe(true);
    expect(session.mode()).toBe('x01');
    expect(session.x01Settings()?.startingScore).toBe(301);
    expect(session.x01Settings()?.doubleIn).toBe(false);
    expect(session.x01Settings()?.doubleOut).toBe(true);
    expect(router.navigate).toHaveBeenCalledWith(['/game/x01-game']);
  });

  it('passes selected double in and double out into the x01 session', () => {
    component.selectedGamemode = 'x01';
    component.selectedDoubleIn = true;
    component.selectedDoubleOut = false;
    component.players = players;

    component.startGame();

    expect(session.x01Settings()?.doubleIn).toBe(true);
    expect(session.x01Settings()?.doubleOut).toBe(false);
  });

  it('starts a cricket session and navigates to the cricket game route', () => {
    component.selectedGamemode = 'cricket';
    component.players = players;

    component.startGame();

    expect(session.hasSession()).toBe(true);
    expect(session.mode()).toBe('cricket');
    expect(session.x01Settings()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/game/cricket-game']);
  });

  it('navigates to the history route', () => {
    component.openHistory();
    expect(router.navigate).toHaveBeenCalledWith(['/history']);
  });
});
