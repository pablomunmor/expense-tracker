import React from 'react';
import { useExpenseStore } from '../../../store/expenseStore';
import { calculatePeriodTotals } from '../../../utils/calculations';
import { formatDate, formatCurrency } from '../../../utils/formatting';

const PeriodHeader = ({ period }) => {
    const setOneOffModal = useExpenseStore(state => state.setOneOffModal);
    const totals = calculatePeriodTotals(period);

    return (
        <div className="bg-white border rounded-lg p-3 mb-4 shadow-sm">
            <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold">{formatDate(period.startDate)} — {formatDate(period.endDate)}</h4>
                <span className={`px-2 py-1 rounded text-xs font-medium ${period.type === 'A' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>Paycheck {period.type}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                <div><div className="text-sm text-gray-500">Income</div><div className="font-semibold text-green-600">{formatCurrency(totals.totalIncome)}</div></div>
                <div><div className="text-sm text-gray-500">Expenses</div><div className="font-semibold text-red-600">{formatCurrency(totals.totalExpenses)}</div></div>
                <div><div className="text-sm text-gray-500">Paid</div><div className="font-semibold text-blue-600">{formatCurrency(totals.totalPaid)}</div></div>
                <div><div className={`text-sm ${totals.difference >= 0 ? 'text-gray-500' : 'text-red-700'}`}>Net</div><div className={`font-semibold ${totals.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(totals.difference)}</div></div>
            </div>
            <button onClick={() => setOneOffModal({ open: true, periodId: period.id, editingId: null, fields: null })} className="mt-2 text-xs bg-gray-100 rounded hover:bg-gray-200 px-2 py-1">Add One-Off</button>
        </div>
    );
};

export default PeriodHeader;
