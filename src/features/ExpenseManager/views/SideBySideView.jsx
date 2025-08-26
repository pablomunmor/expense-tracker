import React from 'react';
import { useExpenseStore } from '../../../store/expenseStore';
import PeriodHeader from '../components/PeriodHeader';
import ExpenseItem from '../../Expenses/ExpenseItem';
import DebtSummary from '../../Debt/DebtSummary';
import QuickAnalytics from '../../Analytics/QuickAnalytics';

const SIDE_BY_SIDE_COUNT = 4;

const SideBySideView = () => {
    const { periods, selectedPeriod, setSelectedPeriod } = useExpenseStore(state => ({
        periods: state.periods,
        selectedPeriod: state.selectedPeriod,
        setSelectedPeriod: state.setSelectedPeriod,
    }));

    const periodsToShow = periods.slice(selectedPeriod, selectedPeriod + SIDE_BY_SIDE_COUNT);

    return (
        <div className="space-y-4">
            <div className="sticky top-2 z-10 bg-gray-50/80 backdrop-blur rounded-md p-2" >
                <div className="grid grid-cols-2 sm:grid-cols-3 items-center gap-2">
                    <div className="order-2 sm:order-1">
                        <button
                            onClick={() => setSelectedPeriod(Math.max(0, selectedPeriod - SIDE_BY_SIDE_COUNT))}
                            disabled={selectedPeriod === 0}
                            className="w-full sm:w-auto px-3 py-2 bg-gray-100 rounded disabled:opacity-50"
                        >
                            Previous {SIDE_BY_SIDE_COUNT}
                        </button>
                    </div>
                    <div className="col-span-2 sm:col-span-1 order-1 sm:order-2 text-center">
                        <span className="text-sm sm:text-base text-gray-700 font-medium">
                            Periods {selectedPeriod + 1}–{Math.min(selectedPeriod + SIDE_BY_SIDE_COUNT, periods.length)}
                        </span>
                    </div>
                    <div className="order-3 text-right">
                        <button
                            onClick={() =>
                                setSelectedPeriod(
                                    Math.min(Math.max(0, periods.length - SIDE_BY_SIDE_COUNT), selectedPeriod + SIDE_BY_SIDE_COUNT)
                                )
                            }
                            disabled={selectedPeriod >= periods.length - SIDE_BY_SIDE_COUNT}
                            className="w-full sm:w-auto px-3 py-2 bg-gray-100 rounded disabled:opacity-50"
                        >
                            Next {SIDE_BY_SIDE_COUNT}
                        </button>
                    </div>
                </div>
            </div >
            <div className="overflow-x-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {periodsToShow.map(period => (
                        <div key={period.id} className="space-y-4">
                            <PeriodHeader period={period} />
                            <div className="space-y-3">
                                <h4 className="font-semibold text-sm">Expenses</h4>
                                {[...(period.expenses || []), ...(period.oneOffExpenses || [])].map(expense => (
                                    <ExpenseItem key={expense.id} expense={expense} periodId={period.id} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DebtSummary />
                <QuickAnalytics />
            </div>
        </div>
    );
};

export default SideBySideView;
