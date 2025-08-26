import React from 'react';
import { useExpenseStore } from '../store/expenseStore';
import PeriodHeader from '../features/Periods/components/PeriodHeader';
import ExpenseItem from '../features/Expenses/components/ExpenseItem';

const SinglePeriodView = () => {
    const { periods, selectedPeriod, setSelectedPeriod } = useExpenseStore(state => ({
        periods: state.periods,
        selectedPeriod: state.selectedPeriod,
        setSelectedPeriod: state.setSelectedPeriod,
    }));

    const period = periods[selectedPeriod];
    if (!period) return <div>Loading period...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <button
                    onClick={() => setSelectedPeriod(Math.max(0, selectedPeriod - 1))}
                    disabled={selectedPeriod === 0}
                    className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                >
                    Previous
                </button>
                <span className="font-semibold">Period {selectedPeriod + 1} of {periods.length}</span>
                <button
                    onClick={() => setSelectedPeriod(Math.min(periods.length - 1, selectedPeriod + 1))}
                    disabled={selectedPeriod === periods.length - 1}
                    className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                >
                    Next
                </button>
            </div>
            <PeriodHeader period={period} />
            <div className="space-y-3 mt-4">
                <h3 className="font-semibold text-lg">Expenses</h3>
                {[...(period.expenses || []), ...(period.oneOffExpenses || [])]
                    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                    .map(expense => (
                        <ExpenseItem key={expense.id} expense={expense} periodId={period.id} />
                    ))}
                {period.expenses?.length === 0 && period.oneOffExpenses?.length === 0 && (
                    <p className="text-gray-500">No expenses for this period.</p>
                )}
            </div>
        </div>
    );
};

export default SinglePeriodView;
