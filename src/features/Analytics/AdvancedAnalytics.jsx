import React from 'react';
import { X, BarChart3, PieChart, LineChart } from 'lucide-react';
import { useExpenseStore } from '../../store/expenseStore';
import { getAnalyticsData } from '../../utils/analytics';
import { formatCurrency } from '../../utils/formatting';

const AdvancedAnalytics = () => {
    const { periods, setShowAnalytics } = useExpenseStore(state => ({
        periods: state.periods,
        setShowAnalytics: state.setShowAnalytics,
    }));

    const { categoryTotals, monthlyTrends } = getAnalyticsData(periods);

    return (
        <div className="bg-white border rounded-lg p-6 w-full max-w-6xl">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Financial Analytics</h3>
                <button onClick={() => setShowAnalytics(false)} className="p-2 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2"><PieChart className="w-4 h-4" /> Category Distribution</h4>
                    <div className="space-y-2">
                        {Object.entries(categoryTotals).map(([category, amount]) => {
                            const total = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
                            const percentage = total ? (amount / total) * 100 : 0;
                            return (
                                <div key={category} className="flex items-center justify-between">
                                    <span className="text-sm">{category}</span>
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
                    <h4 className="font-semibold mb-3 flex items-center gap-2"><LineChart className="w-4 h-4" /> Monthly Cash Flow</h4>
                    <div className="space-y-3">
                        {Object.entries(monthlyTrends).map(([month, data]) => (
                            <div key={month} className="bg-gray-50 p-3 rounded">
                                <div className="font-medium text-sm mb-2">{month}</div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div><div className="text-green-600">Income</div><div className="font-semibold">{formatCurrency(data.income)}</div></div>
                                    <div><div className="text-red-600">Expenses</div><div className="font-semibold">{formatCurrency(data.expenses)}</div></div>
                                    <div>
                                        <div className={data.difference >= 0 ? 'text-green-600' : 'text-red-600'}>Net</div>
                                        <div className={`font-semibold ${data.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(data.difference)}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdvancedAnalytics;
