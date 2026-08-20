import type { route as routeFn } from 'ziggy-js';
import type { SharedData } from './index';

declare global {
    const route: typeof routeFn;
}

/**
 * Tells Inertia's type system which props are shared on every page (see
 * `App\Http\Middleware\HandleInertiaRequests::share()`), so callbacks such as
 * `onSuccess(page)` expose `page.props.flash` with the correct shape.
 */
declare module '@inertiajs/core' {
    interface InertiaConfig {
        sharedPageProps: SharedData;
    }
}
