import React, { useState, useEffect } from 'react';
import { useExpenseStore } from '../../../store/expenseStore';
import Modal from '../../../components/ui/Modal';

const OneOffExpenseModal = () => {
    const { oneOffModal, setOneOffModal, addOneOff, updateOneOff } = useExpenseStore(state => ({
        oneOffModal: state.oneOffModal,
        setOneOffModal: state.setOneOffModal,
        addOneOff: state.addOneOff,
        updateOneOff: state.updateOneOff,
    }));

    const [fields, setFields] = useState(oneOffModal.fields);

    useEffect(() => {
        setFields(oneOffModal.fields);
    }, [oneOffModal.fields]);

    const handleClose = () => {
        setOneOffModal({ open: false, periodId: null, editingId: null, fields: null });
    };

    const handleSave = () => {
        if (oneOffModal.editingId) {
            // This is an update
            updateOneOff(oneOffModal.periodId, oneOffModal.editingId, fields);
        } else {
            // This is a new one-off
            addOneOff(oneOffModal.periodId, fields);
        }
        handleClose();
    };

    if (!oneOffModal.open) {
        return null;
    }

    return (
        <Modal
            isOpen={oneOffModal.open}
            onClose={handleClose}
            title={oneOffModal.editingId ? 'Edit One-Off Expense' : 'Add One-Off Expense'}
        >
            <div className="space-y-4">
                <div>
                    <label htmlFor="one-off-desc" className="block text-sm font-medium text-gray-700">Description</label>
                    <input
                        type="text"
                        id="one-off-desc"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="e.g., Birthday Gift"
                        value={fields?.description || ''}
                        onChange={e => setFields(f => ({ ...f, description: e.target.value }))}
                    />
                </div>
                <div>
                    <label htmlFor="one-off-amount" className="block text-sm font-medium text-gray-700">Amount</label>
                    <input
                        type="number"
                        id="one-off-amount"
                        step="0.01"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="0.00"
                        value={fields?.amount || ''}
                        onChange={e => setFields(f => ({ ...f, amount: parseFloat(e.target.value || 0) }))}
                    />
                </div>
                 <div className="flex justify-end gap-2 pt-4">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!fields?.description || !fields?.amount}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        Save
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default OneOffExpenseModal;
