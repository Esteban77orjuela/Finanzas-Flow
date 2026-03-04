import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Calculator } from 'lucide-react';

interface FloatingCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
}

const FloatingCalculator: React.FC<FloatingCalculatorProps> = ({ isOpen, onClose }) => {
  const [displayValue, setDisplayValue] = useState('0');
  const [storedValue, setStoredValue] = useState<number | null>(null);
  const [pendingOperator, setPendingOperator] = useState<string | null>(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);

  // Format number for display
  const formatResult = (num: number): string => {
    return new Intl.NumberFormat('es-MX', {
      maximumFractionDigits: 8,
    }).format(num);
  };

  const inputDigit = useCallback(
    (digit: string) => {
      if (waitingForNewValue) {
        setDisplayValue(digit);
        setWaitingForNewValue(false);
      } else {
        setDisplayValue(displayValue === '0' ? digit : displayValue + digit);
      }
    },
    [displayValue, waitingForNewValue]
  );

  const inputDecimal = useCallback(() => {
    if (waitingForNewValue) {
      setDisplayValue('0.');
      setWaitingForNewValue(false);
    } else if (!displayValue.includes('.')) {
      setDisplayValue(displayValue + '.');
    }
  }, [displayValue, waitingForNewValue]);

  const resetAll = useCallback(() => {
    setDisplayValue('0');
    setStoredValue(null);
    setPendingOperator(null);
    setWaitingForNewValue(false);
  }, []);

  const removeLast = useCallback(() => {
    if (displayValue.length > 1) {
      setDisplayValue(displayValue.slice(0, -1));
    } else {
      setDisplayValue('0');
    }
  }, [displayValue]);

  const performCalculation = useCallback(
    (nextValue: number) => {
      if (storedValue === null || pendingOperator === null) return nextValue;

      switch (pendingOperator) {
        case '+':
          return storedValue + nextValue;
        case '-':
          return storedValue - nextValue;
        case '×':
          return storedValue * nextValue;
        case '÷':
          return nextValue !== 0 ? storedValue / nextValue : 0;
        default:
          return nextValue;
      }
    },
    [pendingOperator, storedValue]
  );

  const handleOperator = useCallback(
    (operator: string) => {
      const nextValue = parseFloat(displayValue);

      if (storedValue === null) {
        setStoredValue(nextValue);
      } else if (pendingOperator) {
        const result = performCalculation(nextValue);
        setStoredValue(result);
        setDisplayValue(String(result));
      }

      setWaitingForNewValue(true);
      setPendingOperator(operator);
    },
    [displayValue, pendingOperator, performCalculation, storedValue]
  );

  const evaluateResult = useCallback(() => {
    const nextValue = parseFloat(displayValue);

    if (pendingOperator && storedValue !== null) {
      const result = performCalculation(nextValue);
      setDisplayValue(String(result));
      setStoredValue(null);
      setPendingOperator(null);
      setWaitingForNewValue(true);
    }
  }, [displayValue, pendingOperator, performCalculation, storedValue]);

  // Keyboard support
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const { key } = event;

      if (/[0-9]/.test(key)) {
        event.preventDefault();
        inputDigit(key);
        return;
      }

      if (key === '.') {
        event.preventDefault();
        inputDecimal();
        return;
      }

      const operatorSymbols: Record<string, string> = {
        '+': '+',
        '-': '-',
        '*': '×',
        '/': '÷',
      };

      if (key in operatorSymbols) {
        event.preventDefault();
        handleOperator(operatorSymbols[key]);
        return;
      }

      if (key === 'Enter' || key === '=') {
        event.preventDefault();
        evaluateResult();
        return;
      }

      if (key === 'Backspace') {
        event.preventDefault();
        removeLast();
        return;
      }

      if (key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, inputDigit, inputDecimal, handleOperator, evaluateResult, removeLast]);

  const buttons = useMemo(
    () => [
      { label: 'C', action: resetAll, tone: 'danger' as const, span: 2 },
      { label: '⌫', action: removeLast, tone: 'muted' as const },
      { label: '÷', action: () => handleOperator('÷'), tone: 'accent' as const },
      { label: '7', action: () => inputDigit('7') },
      { label: '8', action: () => inputDigit('8') },
      { label: '9', action: () => inputDigit('9') },
      { label: '×', action: () => handleOperator('×'), tone: 'accent' as const },
      { label: '4', action: () => inputDigit('4') },
      { label: '5', action: () => inputDigit('5') },
      { label: '6', action: () => inputDigit('6') },
      { label: '-', action: () => handleOperator('-'), tone: 'accent' as const },
      { label: '1', action: () => inputDigit('1') },
      { label: '2', action: () => inputDigit('2') },
      { label: '3', action: () => inputDigit('3') },
      { label: '+', action: () => handleOperator('+'), tone: 'accent' as const },
      { label: '0', action: () => inputDigit('0'), span: 2 },
      { label: '.', action: inputDecimal },
      { label: '=', action: evaluateResult, tone: 'accent' as const },
    ],
    [resetAll, removeLast, handleOperator, inputDigit, inputDecimal, evaluateResult]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4 animate-fade-in backdrop-blur-sm bg-black/5 dark:bg-black/20 pointer-events-auto">
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      <div className="relative w-full max-w-[320px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in slide-in-from-bottom-5 duration-300">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator size={18} className="text-primary-600" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Calculadora
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 bg-slate-50/50 dark:bg-slate-950/20">
          <div className="text-right text-xs text-slate-400 min-h-[1rem] font-medium mb-1 truncate">
            {pendingOperator && storedValue !== null
              ? `${formatResult(storedValue)} ${pendingOperator}`
              : ''}
          </div>
          <div className="text-right text-4xl font-black tracking-tight text-slate-800 dark:text-white truncate">
            {displayValue}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2.5 p-5">
          {buttons.map(({ label, action, tone, span }, idx) => (
            <button
              key={`${label}-${idx}`}
              type="button"
              onClick={action}
              className={[
                'h-14 text-xl font-bold rounded-2xl transition-all active:scale-90 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                span === 2 ? 'col-span-2' : 'col-span-1',
                tone === 'accent'
                  ? 'bg-primary-600 hover:bg-primary-500 text-white shadow-md shadow-primary-500/20'
                  : tone === 'danger'
                    ? 'bg-rose-100 text-rose-600 hover:bg-rose-200 dark:bg-rose-900/40 dark:text-rose-300'
                    : tone === 'muted'
                      ? 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                      : 'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FloatingCalculator;
