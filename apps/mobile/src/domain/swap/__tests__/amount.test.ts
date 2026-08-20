import {
  decimalToStroops,
  estimatePriceImpactBps,
  minimumReceiveAmount,
  stroopsToDecimal,
} from '../amount';

describe('swap amount math', () => {
  it('converts Stellar decimal amounts without floating point rounding', () => {
    expect(decimalToStroops('12.3456789')).toBe(123_456_789n);
    expect(stroopsToDecimal(123_456_789n)).toBe('12.3456789');
  });

  it('floors minimum output at the selected slippage tolerance', () => {
    expect(minimumReceiveAmount('10.1234567', 50)).toBe('10.0728394');
    expect(minimumReceiveAmount('1', 100)).toBe('0.99');
  });

  it('rejects excess precision and zero amounts', () => {
    expect(() => decimalToStroops('1.00000001')).toThrow();
    expect(() => decimalToStroops('0')).toThrow();
  });

  it('estimates price impact against a small probe quote using integer math', () => {
    expect(
      estimatePriceImpactBps({
        amountIn: '100',
        amountOut: '95',
        probeAmountIn: '1',
        probeAmountOut: '1',
      }),
    ).toBe(500);
  });
});
