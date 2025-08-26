import React from 'react';
import { useExpenseStore } from '../../store/expenseStore';
import { formatCurrency } from '../../utils/formatting';
import { getAnalyticsData } from '../../utils/analytics';
import { exportToCSV } from '../../utils/export';
import { BarChart3, PieChart, LineChart, Download } from 'lucide-react';
import { calculateDebtPayoff } from '../../utils/calculations';

const AdvancedAnalytics = ({ onClose }) => {
    const { periods, sourceExpenses, debtStrategy, extraPayment } = useExpenseStore(state => ({
        periods: state.periods,
        sourceExpenses: state.sourceExpenses,
        debtStrategy: state.debtStrategy,
        extraPayment: state.extraPayment
    }));
    const { categoryTotals, monthlyTrends } = getAnalyticsData(periods);
    const totalCategoryAmount = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);

    return (
        <>
            <div className="flex justify-end gap-2 mb-4">
                <button onClick={() => exportToCSV(periods)} className="px-3 py-2 bg-green-600 text-white rounded text-sm flex items-center gap-2">
                    <Download className="w-4 h-4" /> Export CSV
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2"><PieChart className="w-4 h-4" /> Category Distribution (Next 6 Months)</h4>
                    <div className="space-y-2">
                        {Object.entries(categoryTotals).map(([category, amount]) => {
                            const percentage = totalCategoryAmount ? (amount / totalCategoryAmount) * 100 : 0;
                            return (
                                <div key={category} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded" style={{ backgroundColor: `hsl(${Object.keys(categoryTotals).indexOf(category) * 45}, 70%, 60%)` }}></div>
                                        <span className="text-sm">{category}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold text-sm">{formatCurrency(amount)}</div>
                                        <div className="text-xs text-gray-600">{percentage.toFixed(1)}%</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2"><LineChart className="w-4 h-4" /> Monthly Cash Flow Trends</h4>
                    <div className="space-y-3">
                        {Object.entries(monthlyTrends).map(([month, data]) => (
                            <div key={month} className="bg-gray-50 p-3 rounded">
                                <div className="font-medium text-sm mb-2">{month}</div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div><div className="text-green-600">Income</div><div className="font-semibold">{formatCurrency(data.income)}</div></div>
                                    <div><div className="text-red-600">Expenses</div><div className="font-semibold">{formatCurrency(data.expenses)}</div></div>
                                    <div>
                                        <div className={`${data.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>Net</div>
                                        <div className={`font-semibold ${data.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(data.difference)}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-6 pt-6 border-t">
                <h4 className="font-semibold mb-3">Financial Health Metrics</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-3 rounded"><div className="text-blue-600 text-sm">Avg Monthly Savings</div>
                        <div className="font-bold text-blue-700">
                            {formatCurrency(Object.values(monthlyTrends).reduce((sum, m) => sum + m.difference, 0) / Math.max(1, Object.keys(monthlyTrends).length))}
                        </div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded"><div className="text-purple-600 text-sm">Debt-to-Income Ratio</div>
                        <div className="font-bold text-purple-700">{((calculateDebtPayoff(sourceExpenses, debtStrategy, extraPayment).monthlyPayments / 2800) * 100).toFixed(1)}%</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded"><div className="text-green-600 text-sm">Emergency Fund Goal</div>
                        <div className="font-bold text-green-700">{formatCurrency(Object.values(categoryTotals).reduce((sum, val) => sum + val, 0) / 2)}</div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded"><div className="text-orange-600 text-sm">Largest Category</div>
                        <div className="font-bold text-orange-700">
                            {Object.entries(categoryTotals).reduce((max, [cat, amt]) => amt > max.amt ? { cat, amt } : max, { cat: '', amt: 0 }).cat}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AdvancedAnalytics;
