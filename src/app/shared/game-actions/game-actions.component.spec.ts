import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameActionsComponent } from './game-actions.component';

describe('GameActionsComponent', () => {
  let component: GameActionsComponent;
  let fixture: ComponentFixture<GameActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameActionsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GameActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits undo when the undo button is clicked', () => {
    let undone = 0;
    component.undo.subscribe(() => undone++);
    const button = (fixture.nativeElement as HTMLElement).querySelectorAll('button')[0];
    (button as HTMLButtonElement).click();
    expect(undone).toBe(1);
  });

  it('emits endTurn when the end turn button is clicked', () => {
    let ended = 0;
    component.endTurn.subscribe(() => ended++);
    const button = (fixture.nativeElement as HTMLElement).querySelectorAll('button')[1];
    (button as HTMLButtonElement).click();
    expect(ended).toBe(1);
  });

  it('disables buttons per the input flags', () => {
    component.undoDisabled = true;
    component.endTurnDisabled = true;
    fixture.detectChanges();

    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    );
    expect(buttons.every((b) => (b as HTMLButtonElement).disabled)).toBeTrue();
  });
});
