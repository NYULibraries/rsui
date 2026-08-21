import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Home, RefreshCw, ServerCrash } from 'lucide-react';

interface ErrorPageProps {
    status: number;
}

const errorContent: Record<number, { title: string; description: string; action: 'home' | 'login' | 'back' | 'refresh' }> = {
    403: {
        title: 'Access denied',
        description: 'You do not have permission to view this page.',
        action: 'back',
    },
    404: {
        title: 'Page not found',
        description: 'The page or resource you requested could not be found.',
        action: 'home',
    },
    419: {
        title: 'Your session expired',
        description: 'Please sign in again to continue.',
        action: 'login',
    },
    500: {
        title: 'Something went wrong',
        description: 'An unexpected error occurred. Please try again.',
        action: 'refresh',
    },
    502: {
        title: 'File service unavailable',
        description: 'The file service is temporarily unavailable. Please try again shortly.',
        action: 'refresh',
    },
    503: {
        title: 'Service temporarily unavailable',
        description: 'The application is temporarily unavailable. Please try again shortly.',
        action: 'refresh',
    },
};

export default function ErrorPage({ status }: ErrorPageProps) {
    const content = errorContent[status] ?? errorContent[500];

    return (
        <>
            <Head title={`${status} - ${content.title}`} />
            <main className="flex min-h-svh flex-col items-center justify-center bg-background p-6 text-center">
                <div className="flex w-full max-w-lg flex-col items-center gap-8">
                    <Link href={route('home')} className="rounded-md transition-opacity hover:opacity-80">
                        <AppLogoIcon className="size-10 fill-current text-foreground" />
                        <span className="sr-only">RSUI home</span>
                    </Link>

                    <div className="flex flex-col items-center gap-4">
                        <div className="flex size-16 items-center justify-center rounded-full bg-muted">
                            <ServerCrash className="size-8 text-muted-foreground" aria-hidden="true" />
                        </div>
                        <p className="text-sm font-semibold tracking-widest text-muted-foreground">{status}</p>
                        <h1 className="text-3xl font-semibold tracking-tight">{content.title}</h1>
                        <p className="max-w-md text-muted-foreground">{content.description}</p>
                    </div>

                    {content.action === 'login' && (
                        <Button asChild>
                            <Link href={route('login')}>Sign in</Link>
                        </Button>
                    )}
                    {content.action === 'home' && (
                        <Button asChild>
                            <Link href={route('home')}>
                                <Home aria-hidden="true" />
                                Return home
                            </Link>
                        </Button>
                    )}
                    {content.action === 'back' && (
                        <Button type="button" variant="outline" onClick={() => window.history.back()}>
                            <ArrowLeft aria-hidden="true" />
                            Go back
                        </Button>
                    )}
                    {content.action === 'refresh' && (
                        <Button type="button" variant="outline" onClick={() => window.location.reload()}>
                            <RefreshCw aria-hidden="true" />
                            Try again
                        </Button>
                    )}
                </div>
            </main>
        </>
    );
}
