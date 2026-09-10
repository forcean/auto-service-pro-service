import { calculateLaborFactor, calculateLineAmount } from './billing.utils';

describe('Billing calculations', () => {
  it('uses actual task minutes against estimated minutes', () => {
    expect(calculateLaborFactor([
      { estimateMinute: 120, actualMinute: 90 },
      { estimateMinute: 60, actualMinute: 30 },
    ])).toBe(0.6666666666666666);
  });

  it('keeps quoted quantity when actual minutes are unavailable', () => {
    expect(calculateLaborFactor([{ estimateMinute: 120, actualMinute: 0 }])).toBe(1);
  });

  it('calculates a rounded line total', () => {
    expect(calculateLineAmount(2, 499.99, 50)).toBe(949.98);
  });

  it('rejects a line discount greater than gross amount', () => {
    expect(() => calculateLineAmount(1, 100, 101)).toThrow();
  });
});
