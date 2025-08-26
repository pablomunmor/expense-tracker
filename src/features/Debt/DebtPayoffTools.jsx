import React from 'react';
import { useExpenseStore } from '../../store/expenseStore';
import { formatCurrency } from '../../utils/formatting';
import { calculateDebtPayoff } from '../../utils/calculations';
import { Calculator } from 'lucide-react';

const DebtPayoffTools = ({ onClose }) => {
    const { sourceExpenses, debtStrategy, extraPayment, setDebtStrategy, setExtraPayment } = useExpenseStore(
        (state) => ({
            sourceExpenses: state.sourceExpenses,
            debtStrategy: state.debtStrategy,
            extraPayment: state.extraPayment,
            setDebtStrategy: state.setDebtStrategy,
            setExtraPayment: state.setExtraPayment,
        })
    );
    const payoffData = calculateDebtPayoff(sourceExpenses, debtStrategy, extraPayment);

    return (
        <>
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
                    <h4 className="font-semibold mb-3">Strategy & Extra Payment</h4>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium mb-1">Payoff Strategy</label>
                            <select value={debtStrategy} onChange={(e) => setDebtStrategy(e.target.value)} className="w-full p-2 border rounded">
                                <option value="avalanche">Debt Avalanche (Highest Interest First)</option>
                                <option value="snowball">Debt Snowball (Smallest Balance First)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Extra Monthly Payment</label>
                            <input type="number" value={extraPayment} onChange={(e) => setExtraPayment(e.target.value)} className="w-full p-2 border rounded" placeholder="0.00" />
                        </div>
                    </div>
                </div>

                <div>
                    <h4 className="font-semibold mb-3">Payoff Order</h4>
                    <div className="space-y-2">
                        {payoffData.sortedDebts.map((debt, index) => (
                            <div key={debt.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <div>
                                    <div className="font-medium text-sm">{index + 1}. {debt.description}</div>
                                    <div className="text-xs text-gray-600">{debt.apr}% APR</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-semibold text-sm">{formatCurrency(debt.balance)}</div>
                                    <div className="text-xs text-gray-600">{formatCurrency(debt.minimumPayment)}/mo</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export default DebtPayoffTools;
