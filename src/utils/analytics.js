import { calculatePeriodTotals } from './calculations.js';

export const getAnalyticsData = (periods) => {
    const categoryTotals = {};
    const monthlyTrends = {};
    periods.slice(0, 12).forEach((period, index) => {
        const monthKey = `Month ${Math.floor(index / 2) + 1}`;
        const totals = calculatePeriodTotals(period);
        if (!monthlyTrends[monthKey]) monthlyTrends[monthKey] = { income: 0, expenses: 0, difference: 0 };
        monthlyTrends[monthKey].income += totals.totalIncome;
        monthlyTrends[monthKey].expenses += totals.totalExpenses;
        monthlyTrends[monthKey].difference += totals.difference;
        [...(period.expenses || []), ...(period.oneOffExpenses || [])].forEach(exp => {
            categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
        });
    });
    return { categoryTotals, monthlyTrends };
};
