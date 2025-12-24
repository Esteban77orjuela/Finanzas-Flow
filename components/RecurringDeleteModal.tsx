import React from 'react';
import { X, CalendarClock, Trash2, Repeat } from 'lucide-react';

interface RecurringDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDeleteInstance: () => void;
    onDeleteSeries: () => void;
}

const RecurringDeleteModal: React.FC<RecurringDeleteModalProps> = ({
    isOpen,
    onClose,
    onDeleteInstance,
    onDeleteSeries,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
                <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                        <Repeat size={18} className="text-amber-500" />
                        Transacción Recurrente
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-slate-600 dark:text-slate-300 text-sm mb-6">
                        Esta es una transacción que se repite. ¿Cómo deseas eliminarla?
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={() => {
                                onDeleteInstance();
                                onClose();
                            }}
                            className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group text-left"
                        >
                            <div className="p-2 bg-slate-100 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-700 rounded-full text-slate-500 transition-colors">
                                <Trash2 size={18} />
                            </div>
                            <div>
                                <span className="block font-medium text-slate-800 dark:text-slate-200 text-sm">Solo esta instancia</span>
                                <span className="block text-xs text-slate-500">Elimina solo este registro del historial.</span>
                            </div>
                        </button>

                        <button
                            onClick={() => {
                                onDeleteSeries();
                                onClose();
                            }}
                            className="w-full flex items-center gap-3 p-3 rounded-xl border border-rose-100 dark:border-rose-900/30 bg-rose-50 dark:bg-rose-900/10 hover:bg-rose-100 dark:hover:bg-rose-900/20 transition-colors group text-left"
                        >
                            <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-full text-rose-600 dark:text-rose-400 transition-colors">
                                <CalendarClock size={18} />
                            </div>
                            <div>
                                <span className="block font-medium text-rose-700 dark:text-rose-300 text-sm">Toda la serie</span>
                                <span className="block text-xs text-rose-600/70 dark:text-rose-400/70">Elimina esta y todas las futuras.</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecurringDeleteModal;
