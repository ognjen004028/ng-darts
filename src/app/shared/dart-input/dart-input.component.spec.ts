import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DartThrow } from '../../domain/models/dart-throw';
import { DartInputComponent } from './dart-input.component';

describe('DartInputComponent', () => {
  let component: DartInputComponent;
  let fixture: ComponentFixture<DartInputComponent>;
  let emitted: DartThrow[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DartInputComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DartInputComponent);
    component = fixture.componentInstance;
    emitted = [];
    component.dartThrow.subscribe((dart) => emitted.push(dart));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits a single segment with the default multiplier', () => {
    component.throwSegment(20);
    expect(emitted).toEqual([{ kind: 'single', target: 20 }]);
  });

  it('emits double and triple segments per the selected multiplier', () => {
    component.selectMultiplier('double');
    component.throwSegment(16);
    component.selectMultiplier('triple');
    component.throwSegment(20);

    expect(emitted).toEqual([
      { kind: 'double', target: 16 },
      { kind: 'triple', target: 20 },
    ]);
  });

  it('emits bull from the selected multiplier; triple bull is not representable', () => {
    component.throwBull();
    component.selectMultiplier('double');
    component.throwBull();
    component.selectMultiplier('triple');
    component.throwBull();
    component.throwMiss();

    expect(emitted).toEqual([
      { kind: 'single', target: 'bull' },
      { kind: 'double', target: 'bull' },
      { kind: 'miss' },
    ]);
  });

  it('renders one button per segment plus bull and miss buttons', () => {
    const native = fixture.nativeElement as HTMLElement;
    expect(native.querySelectorAll('.segments button').length).toBe(20);
    expect(native.textContent).toContain('25');
    expect(native.textContent).toContain('Miss');
  });

  it('disables all buttons when disabled', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    const native = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(native.querySelectorAll('button'));
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons.every((b) => (b as HTMLButtonElement).disabled)).toBeTrue();
  });
});
