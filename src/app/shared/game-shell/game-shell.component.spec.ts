import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameShellComponent } from './game-shell.component';

describe('GameShellComponent', () => {
  let fixture: ComponentFixture<GameShellComponent>;
  let native: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameShellComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GameShellComponent);
    native = fixture.nativeElement as HTMLElement;
  });

  it('shows the current player while the game is live', () => {
    fixture.componentRef.setInput('finished', false);
    fixture.componentRef.setInput('currentPlayerName', 'Ada');
    fixture.detectChanges();

    expect(native.textContent).toContain('Up next:');
    expect(native.textContent).toContain('Ada');
    expect(native.textContent).toContain('Leave');
    expect(native.querySelector('.winner-banner')).toBeNull();
  });

  it('shows a win banner and disables the dart pad when finished', () => {
    fixture.componentRef.setInput('finished', true);
    fixture.componentRef.setInput('winnerName', 'Ada');
    fixture.detectChanges();

    expect(native.querySelector('.winner-banner')?.textContent).toContain('Ada wins!');
    expect(native.querySelector('.winner-banner')?.textContent).toContain('Rematch');
    expect(native.querySelector('.winner-banner')?.textContent).toContain('Leave to setup');
    const buttons = Array.from(native.querySelectorAll('app-dart-input button'));
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons.every((button) => (button as HTMLButtonElement).disabled)).toBeTrue();
  });

  it('shows a draw banner when finished without a winner', () => {
    fixture.componentRef.setInput('finished', true);
    fixture.componentRef.setInput('winnerName', null);
    fixture.componentRef.setInput('draw', true);
    fixture.detectChanges();

    expect(native.querySelector('.winner-banner')?.textContent).toContain('Draw!');
  });

  it('exposes the message in a live region', () => {
    fixture.componentRef.setInput('message', 'Bust — turn reverted, next player up.');
    fixture.detectChanges();

    const live = native.querySelector('[aria-live="polite"]');
    expect(live?.textContent).toContain('Bust');
  });
});
