import type { Errors, HttpExceptionResponse } from '@inertiajs/core';
import { router } from '@inertiajs/react';
import { useEffect } from 'react';

/**
 * Registers global Inertia navigation error handlers so transport/runtime
 * errors are visible during development and debugging.
 *
 * Inertia v2 replaced the single `exception` event with `httpException`
 * (non-Inertia error responses) and `networkError` (transport failures).
 */
export function useInertiaErrorHandling() {
    useEffect(() => {
        const handleError = (errors: Errors) => {
            console.error('Inertia navigation error:', errors);
        };

        const handleHttpException = (response: HttpExceptionResponse) => {
            console.error('Inertia navigation HTTP exception:', response);
        };

        const handleNetworkError = (error: Error) => {
            console.error('Inertia navigation network error:', error);
        };

        // `router.on` returns an unsubscribe callback, so each listener is
        // detached when the consuming component unmounts.
        const unsubscribers = [
            router.on('error', (event) => handleError(event.detail.errors)),
            router.on('httpException', (event) => handleHttpException(event.detail.response)),
            router.on('networkError', (event) => handleNetworkError(event.detail.error)),
        ];

        return () => {
            unsubscribers.forEach((unsubscribe) => unsubscribe());
        };
    }, []);
}
