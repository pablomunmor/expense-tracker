import React from 'react';
import { useExpenseStore } from '../../../store/expenseStore';
import DebtSummary from '../../Debt/DebtSummary';
import QuickAnalytics from '../../Analytics/QuickAnalytics';
import { TrendingUp, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatDate } from '../../../utils/formatting';
import { calculatePeriodTotals } from '../../../utils/calculations';

const DashboardView = () => {
    const { periods, setSelectedPeriod, setCurrentView } = useExpenseStore(state => ({
        periods: state.periods,
        setSelectedPeriod: state.setSelectedPeriod,
        setCurrentView: state.setCurrentView,
    }));

    const periodsToShow = periods.slice(0, 12);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <DebtSummary />
                <QuickAnalytics />
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Next 3 Months</h3>
                    <div className="text-2xl font-bold text-green-700">
                        {formatCurrency(periodsToShow.slice(0, 6).reduce((sum, p) => sum + calculatePeriodTotals(p).difference, 0))}
                    </div>
                    <div className="text-sm text-green-600">Net Income</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Unpaid This Month</h3>
                    <div className="text-2xl font-bold text-red-700">
                        {formatCurrency(periodsToShow.slice(0, 2).reduce((sum, p) => sum + calculatePeriodTotals(p).unpaidAmount, 0))}
                    </div>
                    <div className="text-sm text-red-600">Needs Attention</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {periodsToShow.map(period => {
                    const totals = calculatePeriodTotals(period);
                    return (
                        <button
                            key={period.id}
                            className="w-full text-left p-0 bg-transparent border-none"
                            onClick={() => { setSelectedPeriod(period.id); setCurrentView('single'); }}
                        >
                            <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`px-2 py-1 rounded text-xs ${period.type === 'A' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>{period.type}</span>
                                    <div className={`text-lg font-bold ${totals.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(totals.difference)}</div>
                                </div>
                                <div className="text-sm text-gray-600 mb-2">{formatDate(period.startDate)}</div>
                                <div className="space-y-1 text-xs">
                                    <div className="flex justify-between"><span>Income:</span><span className="text-green-600">{formatCurrency(totals.totalIncome)}</span></div>
                                    <div className="flex justify-between"><span>Expenses:</span><span>{formatCurrency(totals.totalExpenses)}</span></div>
                                    <div className="flex justify-between"><span>Unpaid:</span><span className={totals.unpaidAmount > 0 ? 'text-red-600' : 'text-green-600'}>{formatCurrency(totals.unpaidAmount)}</span></div>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default DashboardView;
