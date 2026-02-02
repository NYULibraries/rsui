import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const LoadingSkeleton = () => {
    return (
        <div className="p-4">
            <Skeleton className="mb-4 h-6 w-48" />
            <Skeleton className="h-10 rounded-md" />
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                    <Card key={i} className="p-4">
                        <Skeleton className="mx-auto mb-2 h-6 w-6" />
                        <Skeleton className="mx-auto mb-1 h-4 w-24" />
                        <Skeleton className="mx-auto h-3 w-20" />
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default LoadingSkeleton;
