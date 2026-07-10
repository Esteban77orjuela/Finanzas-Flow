import React from 'react';

export const CardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-slate-800 p-2.5 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 animate-pulse">
    <div className="flex items-center gap-1.5 sm:gap-3 mb-1 sm:mb-2">
      <div className="w-7 h-7 sm:w-10 sm:h-10 bg-slate-200 dark:bg-slate-700 rounded-full" />
      <div className="h-3 sm:h-4 bg-slate-200 dark:bg-slate-700 rounded w-20 hidden sm:block" />
    </div>
    <div className="h-4 sm:h-7 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-1" />
  </div>
);

export const RowSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 p-3 animate-pulse">
    <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full" />
    <div className="flex-1 space-y-2">
      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-32" />
      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-24" />
    </div>
    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-20" />
  </div>
);

export const SectionSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-pulse">
    <div className="p-3 sm:p-5 border-b border-slate-100 dark:border-slate-700">
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-40" />
    </div>
    <div className="px-3 sm:px-5 py-2.5 sm:py-4 border-b border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-4">
      <div className="space-y-1">
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-16" />
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20" />
      </div>
      <div className="space-y-1 text-right">
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-16 ml-auto" />
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20 ml-auto" />
      </div>
    </div>
    {[1, 2, 3].map((i) => <RowSkeleton key={i} />)}
  </div>
);

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      <SectionSkeleton />
      <SectionSkeleton />
    </div>
  </div>
);
