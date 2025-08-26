import React from 'react';
import { useExpenseStore } from '../../store/expenseStore';
import { formatCurrency } from '../../utils/formatting';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const ExpenseItem = ({ expense, periodId }) => {
    const { periods, updateOneOff, updateExpenseStatus, moveExpense, setExpenseModal } = useExpenseStore(state => ({
        periods: state.periods,
        updateOneOff: state.updateOneOff,
        updateExpenseStatus: state.updateExpenseStatus,
        moveExpense: state.moveExpense,
        setExpenseModal: state.setExpenseModal,
    }));

    const currentPeriodIndex = periods.findIndex(p => p.id === periodId);
    const canMoveBack = currentPeriodIndex > 0 && expense.status === 'pending';
    const canMoveForward = currentPeriodIndex < periods.length - 1 && expense.status === 'pending';

    const setStatus = (newStatus) => {
        if (expense.isOneOff) {
            updateOneOff(periodId, expense.id, { status: newStatus });
        } else {
            updateExpenseStatus(periodId, expense.id, newStatus);
        }
    };

    return (
        <button
            className="w-full text-left p-0 bg-transparent border-none"
            onClick={() => setExpenseModal({ open: true, expense, periodId })}
        >
            <div className="bg-white border rounded-lg p-3 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <div className="font-medium">{expense.description}</div>
                            {expense.isOneOff && (
                                <span className="text-[10px] px-1 rounded bg-gray-100 text-gray-700">One-off</span>
                            )}
                        </div>
                        {expense.category && (
                            <div className="text-sm text-gray-600">{expense.category}</div>
                        )}
                    </div>
                    <div className="text-right">
                        <div className="font-semibold">{formatCurrency(expense.amount)}</div>
                        {expense.isDebt && (
                            <div className="text-xs text-purple-600">
                                Balance: {formatCurrency(expense.balance)}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                        Status: <span className="font-medium capitalize">{expense.status || 'pending'}</span>
                    </div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        {canMoveBack && (
                            <button
                                onClick={() => moveExpense(expense, periodId, 'backward')}
                                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center gap-1"
                                title="Move to previous paycheck"
                            >
                                <ChevronLeft className="w-3 h-3" />
                            </button>
                        )}

                        {canMoveForward && (
                            <button
                                onClick={() => moveExpense(expense, periodId, 'forward')}
                                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center gap-1"
                                title="Move to next paycheck"
                            >
                                <ChevronRight className="w-3 h-3" />
                            </button>
                        )}

                        <button
                            onClick={() => setStatus('paid')}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                            disabled={expense.status === 'cleared'}
                        >
                            Paid
                        </button>
                        <button
                            onClick={() => setStatus('cleared')}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                        >
                            Cleared
                        </button>
                    </div>
                </div>
            </div>
        </button>
    );
};

export default ExpenseItem;
