import React from 'react';

interface SkeletonLoaderProps {
  type?: 'card' | 'customer' | 'table' | 'banner';
  count?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ type = 'card', count = 3 }) => {
  const items = Array.from({ length: count });

  if (type === 'customer') {
    return (
      <div className="space-y-2.5 animate-pulse">
        {items.map((_, i) => (
          <div
            key={i}
            className="bg-[#131B2E] border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-slate-800 skeleton-shimmer shrink-0" />
              <div className="space-y-1.5 min-w-0">
                <div className="w-32 h-3.5 bg-slate-800 rounded-md skeleton-shimmer" />
                <div className="w-24 h-2.5 bg-slate-800/60 rounded-md skeleton-shimmer" />
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className="w-16 h-4 bg-slate-800 rounded-md skeleton-shimmer" />
              <div className="w-12 h-2.5 bg-slate-800/60 rounded-md skeleton-shimmer ml-auto" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="space-y-3 animate-pulse">
        {items.map((_, i) => (
          <div
            key={i}
            className="bg-[#131B2E] border border-white/10 rounded-2xl p-3.5 flex items-center justify-between"
          >
            <div className="w-36 h-3 bg-slate-800 rounded-md skeleton-shimmer" />
            <div className="w-16 h-3 bg-slate-800 rounded-md skeleton-shimmer" />
            <div className="w-20 h-3 bg-slate-800 rounded-md skeleton-shimmer" />
          </div>
        ))}
      </div>
    );
  }

  // Card / Template Grid Skeleton
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
      {items.map((_, i) => (
        <div
          key={i}
          className="bg-[#131B2E] border border-white/10 rounded-3xl overflow-hidden shadow-lg flex flex-col"
        >
          <div className="aspect-square bg-slate-800 skeleton-shimmer" />
          <div className="p-4 space-y-2">
            <div className="w-16 h-2.5 bg-slate-800 rounded skeleton-shimmer" />
            <div className="w-3/4 h-4 bg-slate-800 rounded skeleton-shimmer" />
            <div className="pt-2 border-t border-white/5 flex justify-between">
              <div className="w-20 h-3 bg-slate-800 rounded skeleton-shimmer" />
              <div className="w-10 h-3 bg-slate-800 rounded skeleton-shimmer" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
