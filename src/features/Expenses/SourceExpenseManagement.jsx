import React from 'react';
import { useExpenseStore } from '../../store/expenseStore';
import { formatCurrency } from '../../utils/formatting';
import ExpenseForm from './ExpenseForm.jsx';
import { Edit, Trash2 } from 'lucide-react';

const SourceExpenseManagement = ({ onClose }) => {
    const {
        sourceExpenses, editingExpense, setEditingExpense,
        setSourceExpenses, triggerCelebration
    } = useExpenseStore(state => ({
        sourceExpenses: state.sourceExpenses,
        editingExpense: state.editingExpense,
        setEditingExpense: state.setEditingExpense,
        setSourceExpenses: state.setSourceExpenses,
        triggerCelebration: state.triggerCelebration,
    }));

    const handleFormSave = (formData) => {
        if (editingExpense) {
            setSourceExpenses(sourceExpenses.map(exp => exp.id === editingExpense.id ? { ...formData, id: editingExpense.id, active: true } : exp));
            triggerCelebration('Expense template updated! 📝');
        } else {
            const id = Math.max(...sourceExpenses.map(e => e.id), 0) + 1;
            setSourceExpenses([...sourceExpenses, { ...formData, id, active: true }]);
            triggerCelebration('New expense template created! ➕');
        }
        setEditingExpense(null);
    };

    const handleDeleteExpense = (expenseId) =>
        setSourceExpenses(sourceExpenses.map(exp => exp.id === expenseId ? { ...exp, active: false } : exp));

    const handleEditExpense = (expense) => setEditingExpense(expense);

    const categories = ['Housing', 'Food', 'Transportation', 'Utilities', 'Entertainment', 'Healthcare', 'Debt', 'Savings', 'Other'];

    return (
        <>
            <ExpenseForm
                editingExpense={editingExpense}
                onSave={handleFormSave}
                onCancel={() => setEditingExpense(null)}
                categories={categories}
            />

            <div className="space-y-3">
                {sourceExpenses.filter(exp => exp.active).map(expense => (
                    <div key={expense.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <div className="font-medium">{expense.description}</div>
                                {expense.isOneOff && (
                                    <span className="text-[10px] px-1 rounded bg-gray-100 text-gray-700">One-off</span>
                                )}
                            </div>

                            <div className="text-sm text-gray-600">
                                {expense.category} • Due: {expense.dueDate} • Paycheck {expense.paycheckAssignment}
                                {expense.isDebt && ` • Balance: ${formatCurrency(expense.balance)} @ ${expense.apr}% APR`}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold">{formatCurrency(expense.amount)}</span>
                            <button onClick={() => handleEditExpense(expense)} className="p-1 hover:bg-gray-200 rounded"><Edit className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteExpense(expense.id)} className="p-1 hover:bg-red-100 rounded text-red-600"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
};

export default SourceExpenseManagement;
