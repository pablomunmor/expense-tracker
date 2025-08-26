import React from 'react';
import { useExpenseStore } from '../../../store/expenseStore';
import { RotateCcw } from 'lucide-react';

const ViewControls = () => {
    const { currentView, setCurrentView, undoStack, handleUndo } = useExpenseStore(state => ({
        currentView: state.currentView,
        setCurrentView: state.setCurrentView,
        undoStack: state.undoStack,
        handleUndo: state.handleUndo,
    }));

    return (
        <div className="space-y-3 mb-4">
            <div className="flex justify-center">
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                    <div className="text-sm text-blue-600 font-medium text-center">
                        Today: {new Date().toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </div>
                </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
                <button onClick={() => setCurrentView('single')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${currentView === 'single' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    Single Period
                </button>
                <button onClick={() => setCurrentView('side-by-side')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${currentView === 'side-by-side' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    Side-by-Side
                </button>
                <button onClick={() => setCurrentView('dashboard')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${currentView === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    Dashboard
                </button>
                {undoStack.length > 0 && (
                    <button onClick={handleUndo} className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-sm hover:bg-yellow-200 flex items-center gap-2 font-medium transition-colors">
                        <RotateCcw className="w-4 h-4" /> Undo Move
                    </button>
                )}
            </div>
        </div>
    );
};

export default ViewControls;
