import React, { useState, useEffect } from 'react';
import { useExpenseStore } from '../../store/expenseStore';
import { X, Trash2 } from 'lucide-react';

const ExpenseEditModal = () => {
    const {
        expenseModal, setExpenseModal, handleExpenseModalSave, deleteEditingExpense
    } = useExpenseStore(state => ({
        expenseModal: state.expenseModal,
        setExpenseModal: state.setExpenseModal,
        handleExpenseModalSave: state.handleExpenseModalSave,
        deleteEditingExpense: state.deleteEditingExpense
    }));

    const [editedExpense, setEditedExpense] = useState(expenseModal.expense);
    const [showScopeSelection, setShowScopeSelection] = useState(false);
    const [editScope, setEditScope] = useState('instance'); // 'instance' or 'template'

    useEffect(() => {
        setEditedExpense(expenseModal.expense);
        setShowScopeSelection(false);
        setEditScope('instance');
    }, [expenseModal.expense]);

    if (!expenseModal.open || !editedExpense) return null;

    const onClose = () => setExpenseModal({ open: false, expense: null, periodId: null });

    const handleSaveClick = () => {
        if (editedExpense.isOneOff) {
            handleExpenseModalSave(editedExpense, 'instance');
        } else {
            setShowScopeSelection(true);
        }
    };

    const handleScopeConfirm = () => {
        handleExpenseModalSave(editedExpense, editScope);
        setShowScopeSelection(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg p-4 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold">
                        {editedExpense.isOneOff ? 'Edit One-Off Expense' : 'Edit Expense'}
                    </h3>
                    <button className="p-2 rounded hover:bg-gray-100" onClick={onClose}><X className="w-4 h-4" /></button>
                </div>

                <div className="space-y-3">
                    <input
                        className="w-full border rounded px-2 py-1"
                        placeholder="Description"
                        value={editedExpense.description || ''}
                        onChange={e => setEditedExpense(prev => ({ ...prev, description: e.target.value }))}
                    />
                    <input
                        type="number"
                        step="0.01"
                        className="w-full border rounded px-2 py-1"
                        placeholder="Amount"
                        value={editedExpense.amount ?? 0}
                        onChange={e => setEditedExpense(prev => ({ ...prev, amount: parseFloat(e.target.value || 0) }))}
                    />
                    {!editedExpense.isOneOff && (
                        <select
                            className="w-full border rounded px-2 py-1"
                            value={editedExpense.status || 'pending'}
                            onChange={e => setEditedExpense(prev => ({ ...prev, status: e.target.value }))}
                        >
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="cleared">Cleared</option>
                        </select>
                    )}
                </div>

                <div className="mt-4 flex justify-between">
                    <button onClick={deleteEditingExpense} className="px-3 py-2 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 flex items-center gap-2">
                        <Trash2 className="w-4 h-4" /> Delete
                    </button>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-3 py-2 bg-gray-100 rounded text-sm hover:bg-gray-200">Cancel</button>
                        <button onClick={handleSaveClick} className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Save</button>
                    </div>
                </div>

                {showScopeSelection && !editedExpense.isOneOff && (
                    <div className="mt-4 p-3 border rounded">
                        <div className="font-medium mb-2">Apply changes to:</div>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm">
                                <input type="radio" name="scope" value="instance" checked={editScope === 'instance'} onChange={() => setEditScope('instance')} />
                                Only this paycheck (instance)
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <input type="radio" name="scope" value="template" checked={editScope === 'template'} onChange={() => setEditScope('template')} />
                                This and future paychecks (update template)
                            </label>
                        </div>
                        <div className="mt-3 flex justify-end gap-2">
                            <button onClick={() => setShowScopeSelection(false)} className="px-3 py-2 bg-gray-100 rounded text-sm hover:bg-gray-200">Back</button>
                            <button onClick={handleScopeConfirm} className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700">Confirm</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExpenseEditModal;
