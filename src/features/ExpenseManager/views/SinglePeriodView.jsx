import React from 'react';
import { useExpenseStore } from '../../../store/expenseStore';
import PeriodHeader from '../components/PeriodHeader';
import ExpenseItem from '../../Expenses/ExpenseItem';
import DebtSummary from '../../Debt/DebtSummary';
import QuickAnalytics from '../../Analytics/QuickAnalytics';

const SinglePeriodView = () => {
    const { periods, selectedPeriod, setSelectedPeriod } = useExpenseStore(state => ({
        periods: state.periods,
        selectedPeriod: state.selectedPeriod,
        setSelectedPeriod: state.setSelectedPeriod,
    }));

    const period = periods[selectedPeriod];
    if (!period) return null;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <button onClick={() => setSelectedPeriod(Math.max(0, selectedPeriod - 1))} disabled={selectedPeriod === 0} className="px-3 py-2 bg-gray-100 rounded disabled:opacity-50">Previous</button>
                <span className="text-sm text-gray-600">Period {selectedPeriod + 1} of {periods.length}</span>
                <button onClick={() => setSelectedPeriod(Math.min(periods.length - 1, selectedPeriod + 1))} disabled={selectedPeriod === periods.length - 1} className="px-3 py-2 bg-gray-100 rounded disabled:opacity-50">Next</button>
            </div>
            <PeriodHeader period={period} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <h4 className="font-semibold mb-3">Expenses (Click to edit • Use arrows to move between paychecks)</h4>
                    <div className="space-y-3">
                        {[...(period.expenses || []), ...(period.oneOffExpenses || [])].map(expense => (
                            <ExpenseItem key={expense.id} expense={expense} periodId={period.id} />
                        ))}
                    </div>
                </div>
                <div className="space-y-4">
                    <DebtSummary />
                    <QuickAnalytics />
                </div>
            </div>
        </div>
    );
};

export default SinglePeriodView;
