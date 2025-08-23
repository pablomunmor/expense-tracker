import React, { useState, useCallback } from 'react';
import { Save, X } from 'lucide-react';

const ExpenseForm = ({ 
  editingExpense, 
  onSave, 
  onCancel, 
  categories = ['Housing', 'Food', 'Transportation', 'Utilities', 'Entertainment', 'Healthcare', 'Debt', 'Savings', 'Other']
}) => {
  const [formData, setFormData] = useState(() => {
    if (editingExpense) {
      return { ...editingExpense };
    }
    return {
      description: '',
      category: 'Food',
      amount: 0,
      dueDate: 1,
      paycheckAssignment: 'A',
      isDebt: false,
      balance: 0,
      apr: 0,
      minimumPayment: 0
    };
  });

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(() => {
    if (formData.description.trim()) {
      onSave(formData);
    }
  }, [formData, onSave]);

  const handleReset = useCallback(() => {
    setFormData({
      description: '',
      category: 'Food',
      amount: 0,
      dueDate: 1,
      paycheckAssignment: 'A',
      isDebt: false,
      balance: 0,
      apr: 0,
      minimumPayment: 0
    });
    onCancel();
  }, [onCancel]);

  return (
    <div className="bg-gray-50 p-4 rounded-lg mb-6">
      <h4 className="font-medium mb-4">{editingExpense ? 'Edit' : 'Add New'} Expense</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <div>
              <label className="block text-sm font-medium mb-1">Current Balance</label>
              <input
                type="number"
                step="0.01"
                value={formData.balance}
                onChange={(e) => handleInputChange('balance', parseFloat(e.target.value) || 0)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">APR (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.apr}
                onChange={(e) => handleInputChange('apr', parseFloat(e.target.value) || 0)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.0"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Minimum Payment</label>
              <input
                type="number"
                step="0.01"
                value={formData.minimumPayment}
                onChange={(e) => handleInputChange('minimumPayment', parseFloat(e.target.value) || 0)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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