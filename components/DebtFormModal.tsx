import React, { useState, useEffect } from 'react';
import { Debt } from '../types';
import { generateId } from '../utils';
import { X, Check, CreditCard } from 'lucide-react';

interface DebtFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (debt: Debt) => void;
  initialData?: Debt | null;
}

const DEBT_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#3b82f6'];

const DebtFormModal: React.FC<DebtFormModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [totalAmount, setTotalAmount] = useState(initialData?.totalAmount?.toString() || '');
  const [paidAmount, setPaidAmount] = useState(initialData?.paidAmount?.toString() || '');
  const [dueDate, setDueDate] = useState(initialData?.dueDate || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [color, setColor] = useState(initialData?.color || DEBT_COLORS[0]);

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '');
      setTotalAmount(initialData?.totalAmount?.toString() || '');
      setPaidAmount(initialData?.paidAmount?.toString() || '');
      setDueDate(initialData?.dueDate || '');
      setNotes(initialData?.notes || '');
      setColor(initialData?.color || DEBT_COLORS[0]);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !totalAmount) return;

    const debt: Debt = {
      id: initialData?.id || generateId(),
      name: name.trim(),
      totalAmount: parseFloat(totalAmount),
      paidAmount: parseFloat(paidAmount || '0'),
      dueDate: dueDate || undefined,
      notes: notes.trim() || undefined,
      color,
      createdAt: initialData?.createdAt || new Date().toISOString(),
    };

    onSave(debt);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <CreditCard size={20} className="text-rose-600" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
              {initialData ? 'Editar Deuda' : 'Nueva Deuda'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase">Nombre de la Deuda</label>
            <input
              type="text" required
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-slate-800 dark:text-white"
              placeholder="Ej: Tarjeta de Crédito"
              value={name} onChange={(e) => setName(e.target.value)}
              autoFocus spellCheck lang="es"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase">Total</label>
              <input
                type="number" step="0.01" required
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-lg font-bold text-slate-800 dark:text-white"
                placeholder="500,000"
                value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase">Pagado</label>
              <input
                type="number" step="0.01"
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-lg font-bold text-slate-800 dark:text-white"
                placeholder="100,000"
                value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase">Fecha Límite</label>
              <input
                type="date"
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-slate-800 dark:text-white"
                value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase">Color</label>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {DEBT_COLORS.map((c) => (
                  <button
                    key={c} type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900 scale-110' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase">Notas</label>
            <textarea
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm text-slate-800 dark:text-white resize-none"
              rows={3}
              placeholder="Detalles adicionales..."
              value={notes} onChange={(e) => setNotes(e.target.value)}
              spellCheck lang="es"
            />
          </div>

          <button type="submit" className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-lg shadow-rose-500/30 transition-all flex items-center justify-center gap-2">
            <Check size={20} />
            {initialData ? 'Actualizar Deuda' : 'Agregar Deuda'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default DebtFormModal;
