import React from 'react';
import { X, Edit, Trash2 } from 'lucide-react';
import { useExpenseStore } from '../../../store/expenseStore';
import ExpenseForm from './ExpenseForm';
import { formatCurrency } from '../../../utils/formatting';

const SourceExpenseManagement = () => {
    const {
        sourceExpenses,
        editingExpense,
        setSourceExpenses,
        setEditingExpense,
        setShowSourceManagement,
        triggerCelebration,
        categories
    } = useExpenseStore(state => ({
        sourceExpenses: state.sourceExpenses,
        editingExpense: state.editingExpense,
        setSourceExpenses: state.setSourceExpenses,
        setEditingExpense: state.setEditingExpense,
        setShowSourceManagement: state.setShowSourceManagement,
        triggerCelebration: state.triggerCelebration,
        categories: state.categories,
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


    return (
        <div className="bg-white border rounded-lg p-6 max-w-6xl w-full">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Source of Truth Expenses</h3>
                <button onClick={() => setShowSourceManagement(false)} className="p-2 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>

            <ExpenseForm
                editingExpense={editingExpense}
                onSave={handleFormSave}
                onCancel={() => setEditingExpense(null)}
                categories={categories}
            />

            <div className="space-y-3 mt-4">
                {sourceExpenses.filter(exp => exp.active).map(expense => (
                    <div key={expense.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div>
                            <div className="font-medium">{expense.description}</div>
                            <div className="text-sm text-gray-600">{expense.category} • Paycheck {expense.paycheckAssignment}</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold">{formatCurrency(expense.amount)}</span>
                            <button onClick={() => setEditingExpense(expense)} className="p-1 hover:bg-gray-200 rounded"><Edit className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteExpense(expense.id)} className="p-1 hover:bg-red-100 rounded text-red-600"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SourceExpenseManagement;
