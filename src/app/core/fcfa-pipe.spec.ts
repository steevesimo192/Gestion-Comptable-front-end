import { FcfaPipe } from './fcfa-pipe';

describe('FcfaPipe', () => {
  const pipe = new FcfaPipe();

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('formats a full amount with the currency', () => {
    expect(pipe.transform(48_250_000)).toBe('48\u00a0250\u00a0000\u00a0FCFA');
  });

  it('formats without the currency in plain mode', () => {
    expect(pipe.transform(1_500, 'plain')).toBe('1\u00a0500');
  });

  it('shortens millions and thousands', () => {
    expect(pipe.transform(12_500_000, 'short')).toBe('12,5\u00a0M');
    expect(pipe.transform(850_000, 'short')).toBe('850\u00a0k');
  });
});
