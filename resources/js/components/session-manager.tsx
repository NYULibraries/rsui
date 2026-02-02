import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';

const SESSION_LIFETIME_MINUTES = parseInt(import.meta.env.VITE_SESSION_LIFETIME || '25', 10);

const WARNING_THRESHOLD_MINUTES = 5; // Warn 5 minutes before expiration

export function SessionManager() {
    const [showWarning, setShowWarning] = useState(false);
    const sessionTimerRef = useRef<number | null>(null);
    const activityTimerRef = useRef<number | null>(null);

    const resetTimers = useCallback(() => {
        if (sessionTimerRef.current) {
            clearTimeout(sessionTimerRef.current);
        }
        if (activityTimerRef.current) {
            clearTimeout(activityTimerRef.current);
        }

        // Set main session expiration timer
        sessionTimerRef.current = window.setTimeout(
            () => {
                router.post(route('logout'));
            },
            SESSION_LIFETIME_MINUTES * 60 * 1000,
        );

        // Set warning timer
        activityTimerRef.current = window.setTimeout(
            () => {
                setShowWarning(true);
            },
            (SESSION_LIFETIME_MINUTES - WARNING_THRESHOLD_MINUTES) * 60 * 1000,
        );

        setShowWarning(false); // Hide warning if user interacts
    }, []);

    useEffect(() => {
        resetTimers();

        const events = ['mousemove', 'keydown', 'click', 'scroll'];

        events.forEach((event) => {
            window.addEventListener(event, resetTimers);
        });

        // here what I need is a counter to the session expiration
        // and a counter to the warning expiration
        // so that I can show a warning dialog when the session is about to expire
        // and allow the user to keep the session alive
        // and also allow the user to logout

        return () => {
            if (sessionTimerRef.current) {
                clearTimeout(sessionTimerRef.current);
            }
            if (activityTimerRef.current) {
                clearTimeout(activityTimerRef.current);
            }
            events.forEach((event) => {
                window.removeEventListener(event, resetTimers);
            });
        };
    }, [resetTimers]);

    const handleKeepAlive = () => {
        // Make a small request to keep the session alive on the backend
        axios.post('/ping').then(() => {
            resetTimers();
        });
    };

    return (
        <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Session Expiring Soon</AlertDialogTitle>
                    <AlertDialogDescription>
                        Your session will expire in {WARNING_THRESHOLD_MINUTES} minutes due to inactivity. Please click "Keep Alive" to continue your
                        session.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => router.post(route('logout'))}>Logout</AlertDialogCancel>
                    <AlertDialogAction onClick={handleKeepAlive}>Keep Alive</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
