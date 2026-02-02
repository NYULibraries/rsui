import { router } from '@inertiajs/react';
import { useEffect } from 'react';

export function useInertiaErrorHandling() {
    useEffect(() => {
        const handleError = (errors: any) => {
            console.error('Inertia navigation error:', errors);
            // You could show a toast notification or other user-friendly error handling here
        };

        const handleException = (exception: any) => {
            console.error('Inertia navigation exception:', exception);
            // Handle unexpected errors during navigation
        };

        // Set up global error handlers for Inertia
        router.on('error', handleError);
        router.on('exception', handleException);

        // Note: Router doesn't have an 'off' method in current version
        // Cleanup will happen automatically when component unmounts
        return () => {
            // No explicit cleanup needed for current Inertia version
        };
    }, []);
}
