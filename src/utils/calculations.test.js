import { describe, it, expect } from 'vitest';
import { calculatePeriodTotals } from './calculations';

describe('calculatePeriodTotals', () => {
  it('should correctly sum up totals for a given period', () => {
    const period = {
      defaultIncome: 2000,
      additionalIncome: 150,
      expenses: [
        { description: 'Rent', amount: 1200, status: 'cleared' },
        { description: 'Groceries', amount: 300, status: 'paid' },
        { description: 'Gas', amount: 100, status: 'pending' },
      ],
      oneOffExpenses: [
        { description: 'Concert Tickets', amount: 200, status: 'paid' },
      ],
    };

    const totals = calculatePeriodTotals(period);

    expect(totals.totalIncome).toBe(2150);
    expect(totals.totalExpenses).toBe(1800);
    expect(totals.difference).toBe(350);
    expect(totals.totalPaid).toBe(1700); // 1200 (cleared) + 300 (paid) + 200 (one-off paid)
    expect(totals.unpaidAmount).toBe(600); // 300 (paid) + 100 (pending) + 200 (one-off paid)
  });

  it('should handle periods with no expenses', () => {
    const period = {
      defaultIncome: 2000,
      additionalIncome: 0,
      expenses: [],
      oneOffExpenses: [],
    };

    const totals = calculatePeriodTotals(period);

    expect(totals.totalIncome).toBe(2000);
    expect(totals.totalExpenses).toBe(0);
    expect(totals.difference).toBe(2000);
    expect(totals.totalPaid).toBe(0);
    expect(totals.unpaidAmount).toBe(0);
  });
});
