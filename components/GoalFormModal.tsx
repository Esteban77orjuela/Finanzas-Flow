import React, { useState } from 'react';
import { Goal } from '../types';
import { generateId } from '../utils';
import { X, Check, Target } from 'lucide-react';

interface GoalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goal: Goal) => void;
  initialData?: Goal | null;
}

const GOAL_COLORS = ['#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];

const GoalFormModal: React.FC<GoalFormModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [targetAmount, setTargetAmount] = useState(initialData?.targetAmount?.toString() || '');
  const [currentAmount, setCurrentAmount] = useState(initialData?.currentAmount?.toString() || '');
  const [targetDate, setTargetDate] = useState(initialData?.targetDate || '');
  const [color, setColor] = useState(initialData?.color || GOAL_COLORS[5]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !targetAmount || !targetDate) return;

    const goal: Goal = {
      id: initialData?.id || generateId(),
      name: name.trim(),
      targetAmount: parseFloat(targetAmount),
      currentAmount: parseFloat(currentAmount || '0'),
      targetDate,
      color,
      createdAt: initialData?.createdAt || new Date().toISOString(),
    };

    onSave(goal);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Target size={20} className="text-primary-600" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
              {initialData ? 'Editar Meta' : 'Nueva Meta'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase">Nombre de la Meta</label>
            <input
              type="text" required
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-slate-800 dark:text-white"
              placeholder="Ej: Viaje a Japón"
              value={name} onChange={(e) => setName(e.target.value)}
              autoFocus spellCheck lang="es"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase">Meta ($)</label>
              <input
                type="number" step="0.01" required
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-lg font-bold text-slate-800 dark:text-white"
                placeholder="1,000,000"
                value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase">Llevo ($)</label>
              <input
                type="number" step="0.01"
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-lg font-bold text-slate-800 dark:text-white"
                placeholder="200,000"
                value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase">Fecha Objetivo</label>
            <input
              type="month" required
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-slate-800 dark:text-white"
              value={targetDate} onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase">Color</label>
            <div className="flex flex-wrap gap-2">
              {GOAL_COLORS.map((c) => (
                <button
                  key={c} type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900 scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <button type="submit" className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/30 transition-all flex items-center justify-center gap-2">
            <Check size={20} />
            {initialData ? 'Actualizar Meta' : 'Crear Meta'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default GoalFormModal;
