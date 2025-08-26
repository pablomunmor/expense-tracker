import React from 'react';
import { Sparkles } from 'lucide-react';
import { useExpenseStore } from '../../store/expenseStore';

const CelebrationToast = () => {
  const celebration = useExpenseStore((state) => state.celebration);

  if (!celebration.show) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-bounce">
      <Sparkles className="w-5 h-5" />
      <span className="font-medium">{celebration.message}</span>
    </div>
  );
};

export default CelebrationToast;
