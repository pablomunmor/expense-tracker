import React, { useState, useCallback, useEffect } from 'react';
import { Save, X, Plus, Trash2 } from 'lucide-react';

const ExpenseForm = ({
  editingExpense,
  onSave,
  onCancel,
  categories = ['Housing', 'Food', 'Transportation', 'Utilities', 'Entertainment', 'Healthcare', 'Debt', 'Savings', 'Other']
}) => {
  const getInitialFormData = () => {
    if (editingExpense) {
      return {
        ...editingExpense,
        balances: editingExpense.isDebt ? editingExpense.balances || [{ type: 'Main Balance', amount: 0, apr: 0 }] : [],
        creditLimit: editingExpense.isDebt ? editingExpense.creditLimit || 0 : 0,
      };
    }
    return {
      description: '',
      category: 'Food',
      amount: 0,
      dueDate: 1,
      paycheckAssignment: 'A',
      isDebt: false,
      balances: [{ type: 'Main Balance', amount: 0, apr: 0 }],
      creditLimit: 0,
      minimumPayment: 0
    };
  };

  const [formData, setFormData] = useState(getInitialFormData);

  useEffect(() => {
    setFormData(getInitialFormData());
  }, [editingExpense]);

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleBalanceChange = useCallback((index, field, value) => {
    setFormData(prev => {
      const newBalances = [...prev.balances];
      newBalances[index] = { ...newBalances[index], [field]: value };
      return { ...prev, balances: newBalances };
    });
  }, []);

  const addBalance = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      balances: [...prev.balances, { type: 'New Balance', amount: 0, apr: 0 }]
    }));
  }, []);

  const removeBalance = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      balances: prev.balances.filter((_, i) => i !== index)
    }));
  }, []);

  const handleSubmit = useCallback(() => {
    if (formData.description.trim()) {
      onSave(formData);
    }
  }, [formData, onSave]);

  const handleReset = useCallback(() => {
    setFormData(getInitialFormData());
    onCancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCancel, editingExpense]);

  return (
    <div className="bg-gray-50 p-4 rounded-lg mb-6">
      <h4 className="font-medium mb-4">{editingExpense ? 'Edit' : 'Add New'} Expense</h4>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* ... other form inputs ... */}
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter description"
            autoComplete="off"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            value={formData.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Amount</label>
          <input
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Due Date (Day of Month)</label>
          <input
            type="number"
            min="1"
            max="31"
            value={formData.dueDate}
            onChange={(e) => handleInputChange('dueDate', parseInt(e.target.value) || 1)}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Paycheck Assignment</label>
          <select
            value={formData.paycheckAssignment}
            onChange={(e) => handleInputChange('paycheckAssignment', e.target.value)}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="A">Paycheck A</option>
            <option value="B">Paycheck B</option>
          </select>
        </div>

        <div className="flex items-center justify-center">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isDebt}
              onChange={(e) => handleInputChange('isDebt', e.target.checked)}
              className="mr-2 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium">Is Debt Account</span>
          </label>
        </div>

        {formData.isDebt && (
          <>
            <div className="md:col-span-2 lg:col-span-3">
              <h5 className="text-md font-medium mb-2 border-t pt-4">Debt Details</h5>
              <div className="space-y-4">
                {formData.balances.map((balance, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                    <input
                      type="text"
                      value={balance.type}
                      onChange={(e) => handleBalanceChange(index, 'type', e.target.value)}
                      className="w-full p-2 border rounded"
                      placeholder="Balance Type (e.g., Purchases)"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={balance.amount}
                      onChange={(e) => handleBalanceChange(index, 'amount', parseFloat(e.target.value) || 0)}
                      className="w-full p-2 border rounded"
                      placeholder="Amount"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={balance.apr}
                      onChange={(e) => handleBalanceChange(index, 'apr', parseFloat(e.target.value) || 0)}
                      className="w-full p-2 border rounded"
                      placeholder="APR (%)"
                    />
                    <button onClick={() => removeBalance(index)} className="p-2 text-red-500 hover:bg-red-100 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button onClick={addBalance} className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add Balance
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Credit Limit</label>
              <input
                type="number"
                step="0.01"
                value={formData.creditLimit}
                onChange={(e) => handleInputChange('creditLimit', parseFloat(e.target.value) || 0)}
                className="w-full p-2 border rounded"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Minimum Payment</label>
              <input
                type="number"
                step="0.01"
                value={formData.minimumPayment}
                onChange={(e) => handleInputChange('minimumPayment', parseFloat(e.target.value) || 0)}
                className="w-full p-2 border rounded"
                placeholder="0.00"
              />
            </div>
          </>
        )}
      </div>

      <div className="flex gap-2 mt-6">
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 flex items-center gap-2 transition-colors"
        >
          <Save className="w-4 h-4" />
          {editingExpense ? 'Update' : 'Add'} Expense
        </button>

        {editingExpense && (
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:ring-2 focus:ring-gray-500 flex items-center gap-2 transition-colors"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default ExpenseForm;