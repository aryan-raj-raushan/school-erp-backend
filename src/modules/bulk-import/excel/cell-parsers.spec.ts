import { describe, expect, it } from '@jest/globals';
import { ImportColumn } from '../bulk-import.types';
import { matchOption, parseAmount, parseCell, parseDate, parsePhone } from './cell-parsers';

const column = (overrides: Partial<ImportColumn>): ImportColumn => ({
  key: 'k',
  header: 'Field',
  kind: 'text',
  hint: '',
  ...overrides,
});

describe('cell parsers', () => {
  it.each([
    ['2024-06-15', '2024-06-15'],
    ['15-06-2024', '2024-06-15'],
    ['15/06/2024', '2024-06-15'],
    ['5.6.2024', '2024-06-05'],
    ['15 Jun 2024', '2024-06-15'],
    ['15-June-2024', '2024-06-15'],
    ['2024-06-15T00:00:00.000Z', '2024-06-15'],
  ])('parses date %s', (input, expected) => {
    expect(parseDate(input)).toBe(expected);
  });

  it('parses Excel dates and serials', () => {
    expect(parseDate(new Date(Date.UTC(2024, 5, 15)))).toBe('2024-06-15');
    expect(parseDate(45458)).toBe('2024-06-15');
  });

  it.each(['31-02-2024', '2024-13-01', '15/06/24', 'tomorrow', '0'])('rejects date %s', (input) => {
    expect(parseDate(input)).toBeUndefined();
  });

  it.each([
    ['9876543210', '9876543210'],
    ['+91 98765 43210', '9876543210'],
    ['919876543210', '9876543210'],
    ['09876543210', '9876543210'],
    ['98765-43210', '9876543210'],
  ])('normalises phone %s', (input, expected) => {
    expect(parsePhone(input)).toBe(expected);
    expect(parsePhone(Number(expected))).toBe(expected);
  });

  it.each(['12345', '5876543210', '98765432101'])('rejects phone %s', (input) => {
    expect(parsePhone(input)).toBeUndefined();
  });

  it('parses amounts with currency formatting', () => {
    expect(parseAmount('₹ 1,25,000.50')).toBe(125000.5);
    expect(parseAmount('Rs. 500')).toBe(500);
    expect(parseAmount('abc')).toBeUndefined();
  });

  it('matches options by value, label or alias regardless of case and spacing', () => {
    const options = [
      { value: 'A_POSITIVE', label: 'A+' },
      { value: 'A_NEGATIVE', label: 'A-' },
      { value: 'E-Wallet', label: 'E-Wallet', aliases: ['UPI'] },
    ];
    expect(matchOption(options, 'a+')?.value).toBe('A_POSITIVE');
    expect(matchOption(options, 'A-')?.value).toBe('A_NEGATIVE');
    expect(matchOption(options, 'a_negative')?.value).toBe('A_NEGATIVE');
    expect(matchOption(options, ' upi ')?.value).toBe('E-Wallet');
    expect(matchOption(options, 'B+')).toBeUndefined();
  });

  it('reports required, length, digits and enum errors', () => {
    expect(parseCell(column({ required: true }), '  ').error).toBe('Field is required');
    expect(parseCell(column({ maxLength: 3 }), 'abcd').error).toMatch(/at most 3/);
    expect(parseCell(column({ kind: 'digits', length: 6 }), '30200').error).toMatch(/exactly 6/);
    expect(parseCell(column({ kind: 'digits', length: 6 }), '302 001').value).toBe('302001');
    expect(parseCell(column({ kind: 'amount' }), '-5').error).toMatch(/negative/);
    expect(parseCell(column({ kind: 'amount' }), '1.234').error).toMatch(/2 decimal/);
    expect(parseCell(column({ kind: 'boolean' }), 'Yes').value).toBe(true);
    expect(parseCell(column({ kind: 'boolean' }), 'maybe').error).toMatch(/Yes or No/);
    expect(
      parseCell(column({ kind: 'enum', options: [{ value: 'X', label: 'Ex' }] }), 'Y').error,
    ).toMatch(/choose one of: Ex/);
    expect(parseCell(column({}), undefined)).toEqual({});
  });
});
