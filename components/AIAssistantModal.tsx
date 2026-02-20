import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  X,
  Check,
  AlertCircle,
  RefreshCw,
  Calendar,
  Tag,
  Wallet,
} from 'lucide-react';
import { Category, Account, TransactionType, Frequency } from '../types';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  accounts: Account[];
  onExecuteContext: (actions: AIAction[]) => Promise<void>;
}

export interface AIAction {
  type: 'TRANSACTION' | 'RECURRING';
  description: string;
  amount: number;
  transactionType: TransactionType;
  date: string; // ISO Date YYYY-MM-DD
  categoryName: string;
  accountName: string;
  isRecurring?: boolean;
  frequency?: Frequency;
  confidence: number; // 0-1
}

const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  categories,
  accounts,
  onExecuteContext,
}) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [proposedActions, setProposedActions] = useState<AIAction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('GROQ_API_KEY') || '');
  const [showKeyInput, setShowKeyInput] = useState(!localStorage.getItem('GROQ_API_KEY'));

  if (!isOpen) return null;

  const handleSaveKey = () => {
    localStorage.setItem('GROQ_API_KEY', apiKey);
    setShowKeyInput(false);
  };

  const processPrompt = async () => {
    if (!prompt.trim()) return;
    if (!apiKey) {
      setShowKeyInput(true);
      return;
    }

    setLoading(true);
    setError(null);
    setProposedActions([]);

    try {
      // Construct Context
      const categoriesList = categories.map((c) => c.name).join(', ');
      const accountsList = accounts.map((a) => a.name).join(', ');
      const today = new Date().toISOString().split('T')[0];

      const systemPrompt = `
        Act as a financial assistant. Today is ${today}.
        Parse the user's natural language input and extract financial actions.
        
        Context:
        - Available Categories: [${categoriesList}]
        - Available Accounts: [${accountsList}]
        
        OUTPUT ONLY VALID JSON. NO TEXT. NO MARKDOWN.
        Output format (Array of objects):
        [
          {
            "type": "TRANSACTION" | "RECURRING",
            "description": "Short description",
            "amount": number,
            "transactionType": "INCOME" | "EXPENSE",
            "date": "YYYY-MM-DD",
            "categoryName": "Best match from list",
            "accountName": "Best match from list",
            "frequency": "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "YEARLY",
            "confidence": 1.0
          }
        ]
      `;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || 'Error en la API de Groq');
      }

      const content = data.choices[0]?.message?.content;
      if (!content) throw new Error('No se recibió respuesta de la IA');

      // Groq sometimes returns a wrapper object if told json_object
      let actions: AIAction[] = [];
      const parsed = JSON.parse(content);

      if (Array.isArray(parsed)) {
        actions = parsed;
      } else if (parsed.actions) {
        actions = parsed.actions;
      } else {
        // En algunos casos la IA podría devolver { "propuesta": [...] }
        const firstKey = Object.keys(parsed)[0];
        if (Array.isArray(parsed[firstKey])) {
          actions = parsed[firstKey];
        }
      }

      setProposedActions(actions);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error procesando la solicitud. Verifica tu Groq API Key.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    setLoading(true);
    try {
      await onExecuteContext(proposedActions);
      onClose();
      setPrompt('');
      setProposedActions([]);
    } catch (err) {
      setError('Error al guardar los datos en la base de datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-t-2xl text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
              <Sparkles size={24} className="text-yellow-300" />
            </div>
            <div>
              <div>
                <h2 className="text-xl font-bold">Asistente IA (Groq Speed)</h2>
                <div className="flex items-center gap-2">
                  <p className="text-indigo-100 text-sm">
                    Describe tus movimientos y yo me encargo
                  </p>
                  {!showKeyInput && (
                    <button
                      onClick={() => setShowKeyInput(true)}
                      className="text-[10px] bg-white/20 px-2 py-0.5 rounded hover:bg-white/30 transition-colors uppercase font-bold"
                    >
                      Cambiar Llave
                    </button>
                  )}
                </div>
              </div>{' '}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* API Key Input (Hidden if set) */}
          {showKeyInput && (
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Tu API Key de Groq (gsk_...)
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Pegar gsk_... aquí..."
                  className="flex-1 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button
                  onClick={handleSaveKey}
                  className="px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:brightness-110"
                >
                  Guardar
                </button>
                {localStorage.getItem('GROQ_API_KEY') && (
                  <button
                    onClick={() => setShowKeyInput(false)}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg"
                  >
                    Cancelar
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Saca tu llave gratis en console.groq.com. ¡Es mucho más rápida que Gemini!
              </p>
            </div>
          )}

          {/* User Input */}
          {!showKeyInput && proposedActions.length === 0 && (
            <div className="space-y-4">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ejemplo: 'Ayer gasté 50 mil en almuerzo (efectivo) y hoy pagué 120 mil del recibo de luz (nómina). También recuérdame pagar el gimnasio (80 mil) cada mes.'"
                className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-slate-800 dark:text-slate-200 text-lg placeholder-slate-400"
              />

              {error && (
                <div className="flex items-center gap-2 text-rose-500 bg-rose-50 dark:bg-rose-900/20 p-3 rounded-lg text-sm">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <button
                onClick={processPrompt}
                disabled={loading || !prompt.trim()}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="animate-spin" /> Procesando...
                  </>
                ) : (
                  <>
                    <Send size={20} /> Analizar y Crear
                  </>
                )}
              </button>
            </div>
          )}

          {/* Preview Results */}
          {proposedActions.length > 0 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                Propuesta de Acciones ({proposedActions.length})
              </h3>

              <div className="space-y-3">
                {proposedActions.map((action, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700"
                  >
                    <div
                      className={`p-3 rounded-xl ${action.transactionType === 'INCOME' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}
                    >
                      {action.transactionType === 'INCOME' ? (
                        <Wallet size={20} />
                      ) : (
                        <Tag size={20} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 truncate">
                          {action.description}
                        </h4>
                        <span
                          className={`font-mono font-bold ${action.transactionType === 'INCOME' ? 'text-emerald-600' : 'text-rose-500'}`}
                        >
                          {action.transactionType === 'INCOME' ? '+' : '-'}$
                          {action.amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2mt-1 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} /> {action.date}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded-md text-xs">
                          {action.categoryName}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded-md text-xs">
                          {action.accountName}
                        </span>
                        {action.type === 'RECURRING' && (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-md text-xs font-bold border border-indigo-200 dark:border-indigo-800">
                            🔄 Recurrente ({action.frequency})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setProposedActions([])}
                  className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExecute}
                  disabled={loading}
                  className="flex-[2] py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="animate-spin" /> : <Check size={20} />}
                  Confirmar y Guardar Todo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIAssistantModal;
