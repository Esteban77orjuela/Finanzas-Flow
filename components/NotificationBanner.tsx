import React from 'react';
import { Notification } from '../types';
import { X, AlertTriangle, Info, CheckCircle, AlertCircle } from 'lucide-react';

interface NotificationBannerProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

const icons: Record<string, React.ReactNode> = {
  info: <Info size={18} />,
  warning: <AlertTriangle size={18} />,
  success: <CheckCircle size={18} />,
  error: <AlertCircle size={18} />,
};

const colors: Record<string, string> = {
  info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
  warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
  success: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
  error: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300',
};

const NotificationBanner: React.FC<NotificationBannerProps> = ({ notifications, onDismiss }) => {
  const active = notifications.filter(n => !n.dismissed);
  if (active.length === 0) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md space-y-2 px-4">
      {active.slice(0, 3).map(n => (
        <div
          key={n.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm animate-fade-in ${colors[n.type]}`}
        >
          <span className="flex-shrink-0 mt-0.5">{icons[n.type]}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">{n.title}</p>
            <p className="text-xs opacity-80">{n.message}</p>
          </div>
          <button
            onClick={() => onDismiss(n.id)}
            className="flex-shrink-0 p-0.5 hover:opacity-70 transition-opacity"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationBanner;
