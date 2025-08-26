import React from 'react';
import { useExpenseStore } from '../../../store/expenseStore';
import { formatDate, formatCurrency } from '../../../utils/formatting';
import { calculatePeriodTotals } from '../../../utils/calculations';

const PeriodHeader = ({ period }) => {
    const { setOneOffModal } = useExpenseStore(state => ({
        setOneOffModal: state.setOneOffModal
    }));
    const totals = calculatePeriodTotals(period);

    return (
        <div className="bg-white border rounded-lg p-1 mb-4 shadow-sm transition-all">
            <div className="text-xs sm:text-sm font-medium text-gray-900 text-center leading-snug">
                <div className="sm:hidden">
                    <div>{formatDate(period.startDate)}</div>
                    <div>{formatDate(period.endDate)}</div>
                </div>
                <div className="hidden sm:block">
                    {formatDate(period.startDate)} — {formatDate(period.endDate)}
                </div>
            </div>
            <button
                onClick={() => setOneOffModal({ open: true, periodId: period.id, editingId: null, fields: { description: '', amount: 0, category: 'Other', status: 'pending', notes: '' } })}
                className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
            >
                Add One‑Off
            </button>
            <div className="mt-2 flex items-center justify-between gap-2">
                <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${period.type === 'A' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}
                    title={`Paycheck ${period.type}`}
                >
                    Paycheck {period.type}
                </span>
                <div className="text-right">
                    <div className="text-[11px] text-gray-600 leading-none">Net Income</div>
                    <div className={`font-bold text-lg sm:text-xl leading-tight ${totals.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(totals.difference)}
                    </div>
                </div>
            </div>
            <div className="mt-3 divide-y divide-gray-100">
                <div className="py-1.5 flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total Income</span>
                    <span className="font-semibold text-green-600">{formatCurrency(totals.totalIncome)}</span>
                </div>
                <div className="py-1.5 flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total Expenses</span>
                    <span className="font-semibold">{formatCurrency(totals.totalExpenses)}</span>
                </div>
                <div className="py-1.5 flex items-center justify-between text-sm">
                    <span className="text-gray-600">Paid</span>
                    <span className="font-semibold text-blue-600">{formatCurrency(totals.totalPaid)}</span>
                </div>
                <div className="py-1.5 flex items-center justify-between text-sm">
                    <span className="text-gray-600">Unpaid</span>
                    <span className={`font-semibold ${totals.unpaidAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(totals.unpaidAmount)}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default PeriodHeader;
