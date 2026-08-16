import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Turn } from '../../domain/models/turn';
import { TurnSummaryComponent } from './turn-summary.component';

describe('TurnSummaryComponent', () => {
  let component: TurnSummaryComponent;
  let fixture: ComponentFixture<TurnSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TurnSummaryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TurnSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders three empty slots without a turn', () => {
    const native = fixture.nativeElement as HTMLElement;
    expect(native.querySelectorAll('.slot').length).toBe(3);
    expect(native.textContent?.trim().replace(/—/g, '').trim()).toBe('');
  });

  it('labels darts per RULES.md notation (D25 for inner bull)', () => {
    const turn: Turn = {
      playerId: 'p1',
      throws: [
        { kind: 'triple', target: 20 },
        { kind: 'single', target: 'bull' },
        { kind: 'double', target: 'bull' },
      ],
    };
    component.turn = turn;
    fixture.detectChanges();

    const native = fixture.nativeElement as HTMLElement;
    const text = native.textContent ?? '';
    expect(text).toContain('T20');
    expect(text).toContain('25');
    expect(text).toContain('D25');
    expect(native.querySelectorAll('.slot.filled').length).toBe(3);
  });

  it('fills only the slots that have darts', () => {
    component.turn = {
      playerId: 'p1',
      throws: [{ kind: 'miss' }],
    };
    fixture.detectChanges();

    const native = fixture.nativeElement as HTMLElement;
    expect(native.querySelectorAll('.slot.filled').length).toBe(1);
    expect(native.textContent).toContain('Miss');
  });
});
