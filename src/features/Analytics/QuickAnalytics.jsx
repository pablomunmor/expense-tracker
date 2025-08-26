import React from 'react';
import { useExpenseStore } from '../../store/expenseStore';
import { formatCurrency } from '../../utils/formatting';
import { getAnalyticsData } from '../../utils/analytics';
import { BarChart3, TrendingUp } from 'lucide-react';

const QuickAnalytics = () => {
    const { periods, setShowAnalytics } = useExpenseStore(state => ({
        periods: state.periods,
        setShowAnalytics: state.setShowAnalytics
    }));
    const { categoryTotals } = getAnalyticsData(periods);

    return (
        <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Quick Analytics</h3>
            <div className="space-y-3">
                {Object.entries(categoryTotals).slice(0, 5).map(([category, total]) => (
                    <div key={category} className="flex justify-between items-center">
                        <span className="text-sm">{category}</span>
                        <span className="font-medium">{formatCurrency(total)}</span>
                    </div>
                ))}
            </div>
            <button onClick={() => setShowAnalytics(true)} className="w-full mt-3 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center justify-center gap-2">
                <TrendingUp className="w-4 h-4" /> Full Analytics
            </button>
        </div>
    );
};

export default QuickAnalytics;
