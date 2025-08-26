import React from 'react';
import { useExpenseStore } from '../../store/expenseStore';
import { formatCurrency } from '../../utils/formatting';
import { CreditCard, Calculator } from 'lucide-react';

const DebtSummary = () => {
    const { sourceExpenses, setShowDebtTools } = useExpenseStore(state => ({
        sourceExpenses: state.sourceExpenses,
        setShowDebtTools: state.setShowDebtTools
    }));
    const debtExpenses = sourceExpenses.filter(exp => exp.isDebt && exp.active);
    const totalDebt = debtExpenses.reduce((sum, exp) => sum + exp.balance, 0);
    const monthlyPayments = debtExpenses.reduce((sum, exp) => sum + exp.minimumPayment, 0);

    return (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-semibold text-purple-800 mb-3 flex items-center gap-2"><CreditCard className="w-5 h-5" /> Debt Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                <div><div className="text-purple-600">Total Debt</div><div className="font-bold text-purple-800">{formatCurrency(totalDebt)}</div></div>
                <div><div className="text-purple-600">Monthly Payments</div><div className="font-bold text-purple-800">{formatCurrency(monthlyPayments)}</div></div>
            </div>
            <div className="space-y-2">
                {debtExpenses.map(debt => (
                    <div key={debt.id} className="flex justify-between items-center text-sm">
                        <span>{debt.description}</span>
                        <div className="text-right">
                            <div className="font-medium">{formatCurrency(debt.balance)}</div>
                            <div className="text-xs text-purple-600">{debt.apr}% APR</div>
                        </div>
                    </div>
                ))}
            </div>
            <button onClick={() => setShowDebtTools(true)} className="w-full mt-3 px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 flex items-center justify-center gap-2">
                <Calculator className="w-4 h-4" /> Payoff Calculator
            </button>
        </div>
    );
};

export default DebtSummary;
