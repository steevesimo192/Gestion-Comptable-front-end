import { positiveAmount, roundMoney, sumMoney } from './money';

describe('money', () => {
  it('should round to the cent so that floating point noise never breaks a comparison', () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
  });

  it('should treat unreadable values as zero', () => {
    expect(roundMoney(NaN)).toBe(0);
    expect(roundMoney(Infinity)).toBe(0);
    expect(sumMoney([100, NaN, 50])).toBe(150);
  });

  it('should only keep strictly positive amounts', () => {
    expect(positiveAmount(1500)).toBe(1500);
    expect(positiveAmount(-1500)).toBe(0);
    expect(positiveAmount(0)).toBe(0);
    expect(positiveAmount(null)).toBe(0);
    expect(positiveAmount('abc')).toBe(0);
  });
});
