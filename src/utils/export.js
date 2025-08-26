import { formatDate } from './formatting';

export const exportToCSV = (periods) => {
    const headers = ['Period', 'Type', 'Date', 'Description', 'Category', 'Amount', 'Status', 'Amount Cleared'];
    const rows = [];
    periods.forEach(period => {
        [...(period.expenses || []), ...(period.oneOffExpenses || [])].forEach(expense => {
            rows.push([
                period.id + 1,
                period.type,
                formatDate(period.startDate),
                expense.description,
                expense.category,
                expense.amount,
                expense.status,
                expense.amountCleared || expense.amount
            ]);
        });
    });
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expense-planning.csv';
    a.click();
    window.URL.revokeObjectURL(url);
};
