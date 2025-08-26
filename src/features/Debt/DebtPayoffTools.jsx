import React from 'react';
import { X } from 'lucide-react';
import { useExpenseStore } from '../../store/expenseStore';
import { calculateDebtPayoff } from '../../utils/calculations';
import { formatCurrency } from '../../utils/formatting';

const DebtPayoffTools = () => {
    const {
        sourceExpenses,
        debtStrategy,
        extraPayment,
        setDebtStrategy,
        setExtraPayment,
        setShowDebtTools
    } = useExpenseStore(state => ({
        sourceExpenses: state.sourceExpenses,
        debtStrategy: state.debtStrategy,
        extraPayment: state.extraPayment,
        setDebtStrategy: state.setDebtStrategy,
        setExtraPayment: state.setExtraPayment,
        setShowDebtTools: state.setShowDebtTools,
    }));

    const payoffData = calculateDebtPayoff(sourceExpenses, debtStrategy, extraPayment);

    return (
        <div className="bg-white border rounded-lg p-6 w-full max-w-4xl">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Debt Payoff Calculator</h3>
                <button onClick={() => setShowDebtTools(false)} className="p-2 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-red-50 p-4 rounded-lg">
                    <div className="text-red-600 text-sm">Total Debt</div>
                    <div className="text-2xl font-bold text-red-700">{formatCurrency(payoffData.totalDebt)}</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-blue-600 text-sm">Payoff Time</div>
                    <div className="text-2xl font-bold text-blue-700">{Math.floor(payoffData.payoffMonths / 12)}y {payoffData.payoffMonths % 12}m</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="text-orange-600 text-sm">Total Interest</div>
                    <div className="text-2xl font-bold text-orange-700">{formatCurrency(payoffData.totalInterest)}</div>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium mb-1">Payoff Strategy</label>
                    <select value={debtStrategy} onChange={(e) => setDebtStrategy(e.target.value)} className="w-full p-2 border rounded">
                        <option value="avalanche">Debt Avalanche (Highest Interest First)</option>
                        <option value="snowball">Debt Snowball (Smallest Balance First)</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Extra Monthly Payment</label>
                    <input type="number" value={extraPayment} onChange={(e) => setExtraPayment(parseFloat(e.target.value) || 0)} className="w-full p-2 border rounded" placeholder="0.00" />
                </div>
            </div>
        </div>
    );
};

export default DebtPayoffTools;
