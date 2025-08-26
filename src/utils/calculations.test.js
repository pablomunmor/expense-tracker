import { describe, it, expect } from 'vitest';
import { calculatePeriodTotals } from './calculations';

describe('calculatePeriodTotals', () => {
    it('should correctly sum expenses and calculate totals for a period', () => {
        const period = {
            defaultIncome: 2000,
            additionalIncome: 100,
            expenses: [
                { amount: 500, status: 'paid' },
                { amount: 250, status: 'pending' },
            ],
            oneOffExpenses: [
                { amount: 50, status: 'cleared' },
            ],
        };

        const totals = calculatePeriodTotals(period);

        expect(totals.totalIncome).toBe(2100);
        expect(totals.totalExpenses).toBe(800); // 500 + 250 + 50
        expect(totals.totalPaid).toBe(550); // 500 (paid) + 50 (cleared)
        expect(totals.unpaidAmount).toBe(750); // 500 (paid) + 250 (pending)
        expect(totals.difference).toBe(1300); // 2100 - 800
        expect(totals.remainingAfterPaid).toBe(1550); // 2100 - 550
    });

    it('should handle periods with no expenses', () => {
        const period = {
            defaultIncome: 1500,
            additionalIncome: 0,
            expenses: [],
            oneOffExpenses: [],
        };

        const totals = calculatePeriodTotals(period);

        expect(totals.totalIncome).toBe(1500);
        expect(totals.totalExpenses).toBe(0);
        expect(totals.totalPaid).toBe(0);
        expect(totals.unpaidAmount).toBe(0);
        expect(totals.difference).toBe(1500);
        expect(totals.remainingAfterPaid).toBe(1500);
    });

    it('should handle periods where expenses exceed income', () => {
        const period = {
            defaultIncome: 1000,
            additionalIncome: 0,
            expenses: [
                { amount: 1200, status: 'pending' },
            ],
            oneOffExpenses: [],
        };

        const totals = calculatePeriodTotals(period);

        expect(totals.totalIncome).toBe(1000);
        expect(totals.totalExpenses).toBe(1200);
        expect(totals.totalPaid).toBe(0);
        expect(totals.unpaidAmount).toBe(1200);
        expect(totals.difference).toBe(-200);
        expect(totals.remainingAfterPaid).toBe(1000);
    });
});
