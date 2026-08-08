import { DartThrow, dartValue, isBull, isDouble } from './dart-throw';

describe('dartValue', () => {
  it('scores a miss as 0', () => {
    expect(dartValue({ kind: 'miss' })).toBe(0);
  });

  it('scores singles as the segment number', () => {
    expect(dartValue({ kind: 'single', target: 1 })).toBe(1);
    expect(dartValue({ kind: 'single', target: 20 })).toBe(20);
  });

  it('scores doubles and triples with multipliers', () => {
    expect(dartValue({ kind: 'double', target: 20 })).toBe(40);
    expect(dartValue({ kind: 'triple', target: 20 })).toBe(60);
  });

  it('scores the outer bull as 25 and the inner bull as 50', () => {
    expect(dartValue({ kind: 'single', target: 'bull' })).toBe(25);
    expect(dartValue({ kind: 'double', target: 'bull' })).toBe(50);
  });
});

describe('isDouble', () => {
  it('treats the inner bull as a double (D25)', () => {
    expect(isDouble({ kind: 'double', target: 'bull' })).toBeTrue();
  });

  it('treats double segments as doubles and everything else as not', () => {
    expect(isDouble({ kind: 'double', target: 16 })).toBeTrue();
    expect(isDouble({ kind: 'single', target: 16 })).toBeFalse();
    expect(isDouble({ kind: 'triple', target: 16 })).toBeFalse();
    expect(isDouble({ kind: 'single', target: 'bull' })).toBeFalse();
    expect(isDouble({ kind: 'miss' })).toBeFalse();
  });
});

describe('isBull', () => {
  it('detects bull throws', () => {
    expect(isBull({ kind: 'single', target: 'bull' })).toBeTrue();
    expect(isBull({ kind: 'double', target: 'bull' })).toBeTrue();
    expect(isBull({ kind: 'single', target: 20 })).toBeFalse();
    expect(isBull({ kind: 'miss' })).toBeFalse();
  });
});

// Re-export check keeps the DartThrow type used in this file's typing.
const _typeCheck: DartThrow = { kind: 'single', target: 20 };
void _typeCheck;
