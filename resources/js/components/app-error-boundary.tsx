import { Button } from '@/components/ui/button';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface AppErrorBoundaryProps {
    children: ReactNode;
}

interface AppErrorBoundaryState {
    hasError: boolean;
}

export default class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
    state: AppErrorBoundaryState = { hasError: false };

    static getDerivedStateFromError(): AppErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('Unhandled application render error:', error, errorInfo);
    }

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        return (
            <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6 text-center">
                <h1 className="text-2xl font-semibold">Something went wrong</h1>
                <p className="max-w-md text-muted-foreground">The application encountered an unexpected error. Reload the page to try again.</p>
                <Button type="button" onClick={() => window.location.reload()}>
                    Reload page
                </Button>
            </main>
        );
    }
}
