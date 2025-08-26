const toDate = (v) => {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (typeof v === 'number') return new Date(v);
    if (typeof v === 'string') {
        const t = Date.parse(v);
        if (!Number.isNaN(t)) return new Date(t);
    }
    if (v && typeof v === 'object' && typeof v.toDate === 'function') return v.toDate();
    return null;
};

export const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

export const formatDate = (value) => {
    const d = toDate(value);
    if (!d) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
