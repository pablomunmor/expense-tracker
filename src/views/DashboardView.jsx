import React from 'react';
import { useExpenseStore } from '../store/expenseStore';
import { formatCurrency, formatDate } from '../utils/formatting';
import { calculatePeriodTotals } from '../utils/calculations';

const DashboardView = () => {
    const { periods, setCurrentView, setSelectedPeriod } = useExpenseStore(state => ({
        periods: state.periods,
        setCurrentView: state.setCurrentView,
        setSelectedPeriod: state.setSelectedPeriod,
    }));

    const periodsToShow = periods.slice(0, 12);

    const handlePeriodClick = (periodId) => {
        setSelectedPeriod(periodId);
        setCurrentView('single');
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {periodsToShow.map(period => {
                    const totals = calculatePeriodTotals(period);
                    return (
                        <button
                            type="button"
                            key={period.id}
                            className="bg-white border rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer w-full text-left"
                            onClick={() => handlePeriodClick(period.id)}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <span className={`px-2 py-1 rounded text-xs ${period.type === 'A' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                    Paycheck {period.type}
                                </span>
                                <div className={`text-xl font-bold ${totals.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(totals.difference)}
                                </div>
                            </div>
                            <div className="text-sm text-gray-600 mb-2">{formatDate(period.startDate)}</div>
                            <div className="space-y-1 text-xs">
                                <div className="flex justify-between"><span>Income:</span> <span className="font-medium text-green-600">{formatCurrency(totals.totalIncome)}</span></div>
                                <div className="flex justify-between"><span>Expenses:</span> <span className="font-medium">{formatCurrency(totals.totalExpenses)}</span></div>
                                <div className="flex justify-between"><span>Unpaid:</span> <span className={`font-medium ${totals.unpaidAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(totals.unpaidAmount)}</span></div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default DashboardView;
