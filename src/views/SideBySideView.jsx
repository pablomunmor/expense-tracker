import React from 'react';
import { useExpenseStore } from '../store/expenseStore';
import PeriodHeader from '../features/Periods/components/PeriodHeader';
import ExpenseItem from '../features/Expenses/components/ExpenseItem';

const SIDE_BY_SIDE_COUNT = 4;

const SideBySideView = () => {
    const { periods, selectedPeriod, setSelectedPeriod } = useExpenseStore(state => ({
        periods: state.periods,
        selectedPeriod: state.selectedPeriod,
        setSelectedPeriod: state.setSelectedPeriod,
    }));

    const periodsToShow = periods.slice(selectedPeriod, selectedPeriod + SIDE_BY_SIDE_COUNT);

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <button
                    onClick={() => setSelectedPeriod(Math.max(0, selectedPeriod - SIDE_BY_SIDE_COUNT))}
                    disabled={selectedPeriod === 0}
                    className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                >
                    Previous {SIDE_BY_SIDE_COUNT}
                </button>
                <span className="font-semibold">
                    Showing Periods {selectedPeriod + 1} - {selectedPeriod + periodsToShow.length}
                </span>
                <button
                    onClick={() => setSelectedPeriod(Math.min(periods.length - SIDE_BY_SIDE_COUNT, selectedPeriod + SIDE_BY_SIDE_COUNT))}
                    disabled={selectedPeriod >= periods.length - SIDE_BY_SIDE_COUNT}
                    className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                >
                    Next {SIDE_BY_SIDE_COUNT}
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {periodsToShow.map(period => (
                    <div key={period.id}>
                        <PeriodHeader period={period} />
                        <div className="space-y-3 mt-4">
                            {[...(period.expenses || []), ...(period.oneOffExpenses || [])]
                                .sort((a,b) => (a.position ?? 0) - (b.position ?? 0))
                                .map(expense => (
                                <ExpenseItem key={expense.id} expense={expense} periodId={period.id} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SideBySideView;
