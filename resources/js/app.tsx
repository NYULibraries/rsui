import '../css/app.css';

import type { ResolvedComponent } from '@inertiajs/react';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import { initializeTheme } from './hooks/use-appearance';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent<{ default: ResolvedComponent }>(
            `./pages/${name}.tsx`,
            import.meta.glob<{ default: ResolvedComponent }>('./pages/**/*.tsx'),
        ).then((module) => module.default),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <>
                <App {...props} />
                <Toaster closeButton expand richColors />
            </>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
if (typeof window !== 'undefined') {
    initializeTheme();
}
