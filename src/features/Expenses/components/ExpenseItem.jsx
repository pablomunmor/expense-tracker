import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useExpenseStore } from '../../../store/expenseStore';
import { formatCurrency } from '../../../utils/formatting';

const ExpenseItem = ({ expense, periodId }) => {
    const {
        setExpenseModal,
        moveExpense,
        updateExpenseStatus,
        selectedPeriod,
        periods
    } = useExpenseStore(state => ({
        setExpenseModal: state.setExpenseModal,
        moveExpense: state.moveExpense,
        updateExpenseStatus: state.updateExpenseStatus,
        selectedPeriod: state.selectedPeriod,
        periods: state.periods,
    }));

    const canMoveBack = selectedPeriod > 0 && expense.status === 'pending';
    const canMoveForward = selectedPeriod < periods.length - 1 && expense.status === 'pending';

    const handleMove = (e, direction) => {
        e.stopPropagation();
        moveExpense(expense, periodId, direction);
    };

    const handleStatusUpdate = (e, status) => {
        e.stopPropagation();
        updateExpenseStatus(periodId, expense.id, status);
    };

    return (
        <button
            type="button"
            className="bg-white border rounded-lg p-3 hover:shadow-md cursor-pointer w-full text-left"
            onClick={() => setExpenseModal({ open: true, expense, periodId })}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                    <div className="font-medium">{expense.description}</div>
                    {expense.category && <div className="text-sm text-gray-600">{expense.category}</div>}
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

            <div className="flex items-center justify-between mt-2">
                <div className="text-xs text-gray-500">
                    Status: <span className="font-medium capitalize">{expense.status || 'pending'}</span>
                </div>
                <div className="flex gap-1">
                    {canMoveBack && (
                        <button type="button" onClick={(e) => handleMove(e, 'backward')} className="p-1 hover:bg-gray-200 rounded">
                            <ChevronLeft size={16} />
                        </button>
                    )}
                    {canMoveForward && (
                        <button type="button" onClick={(e) => handleMove(e, 'forward')} className="p-1 hover:bg-gray-200 rounded">
                            <ChevronRight size={16} />
                        </button>
                    )}
                    <button type="button" onClick={(e) => handleStatusUpdate(e, 'paid')} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                        Paid
                    </button>
                    <button type="button" onClick={(e) => handleStatusUpdate(e, 'cleared')} className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200">
                        Cleared
                    </button>
                </div>
            </div>
        </button>
    );
};

export default ExpenseItem;
