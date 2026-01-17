// React import removed due to being unused

export const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse bg-slate-800/50 rounded-lg ${className}`} />
);

export const TableSkeleton = ({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) => (
    <div className="space-y-4 w-full">
        <div className="flex gap-4">
            {Array.from({ length: cols }).map((_, i) => (
                <Skeleton key={i} className="h-4 flex-1" />
            ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex gap-4 border-t border-slate-800 pt-4">
                {Array.from({ length: cols }).map((_, j) => (
                    <Skeleton key={j} className="h-10 flex-1" />
                ))}
            </div>
        ))}
    </div>
);

export const CardSkeleton = () => (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-2xl" />
            <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
            </div>
        </div>
        <Skeleton className="h-20 w-full" />
        <div className="flex justify-between">
            <Skeleton className="h-8 w-24 rounded-xl" />
            <Skeleton className="h-8 w-24 rounded-xl" />
        </div>
    </div>
);
