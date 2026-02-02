import { Card, CardContent } from '@/components/ui/card';
import { useInertiaErrorHandling } from '@/hooks/use-inertia-errors';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type SearchPageProps, type SearchResult } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useEffect, useState } from 'react';

export default function SearchIndex() {
    useInertiaErrorHandling();

    const { term, results, numFound, start, error, page = 1, totalPages = 1 } = usePage<SearchPageProps>().props;

    const [searchTerm] = useState(term ?? '');

    const [searchResults, setSearchResults] = useState<SearchResult[]>(results ?? []);

    const [isLoading, setIsLoading] = useState(false);

    const [timeoutError, setTimeoutError] = useState<string | null>(null);

    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

    const from = numFound === 0 ? 0 : start + 1;

    const to = Math.min(start + searchResults.length, numFound);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Partners', href: '/' },
        { title: 'Search', href: '/search' },
    ];

    const performSearch = (query: string, targetPage = 1) => {
        if (!query.trim()) return;

        setIsLoading(true);
        setTimeoutError(null);

        const timeoutId = setTimeout(() => {
            setTimeoutError(
                'This search is taking longer than expected. The external API may be experiencing delays. Please try again or contact support if the issue persists.',
            );
            setIsLoading(false);
        }, 15000); // 15 second timeout

        router.get(
            '/search',
            { term: query, page: targetPage },
            {
                preserveState: true,
                onError: (errors) => {
                    console.error('Search error:', errors);
                    clearTimeout(timeoutId);
                    setIsLoading(false);
                },
                onSuccess: () => {
                    clearTimeout(timeoutId);
                },
                onFinish: () => {
                    clearTimeout(timeoutId);
                    setIsLoading(false);
                },
            },
        );
    };

    useEffect(() => {
        setSearchResults(results ?? []);
        setFocusedIndex(null);
    }, [results]);

    const handleResultKeyNav = (e: React.KeyboardEvent) => {
        if (!searchResults.length) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedIndex((i) => (i === null ? 0 : Math.min(i + 1, searchResults.length - 1)));
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedIndex((i) => (i === null ? 0 : Math.max(i - 1, 0)));
        }

        if (e.key === 'Enter' && focusedIndex !== null) {
            window.location.href = `/packages/${searchResults[focusedIndex].package_id}`;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Search" />

            <div className="flex flex-col gap-6 px-6 py-4" onKeyDown={handleResultKeyNav} tabIndex={0}>
                {/* Timeout Error */}
                {timeoutError && (
                    <Card className="max-w-2xl border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-3">
                                <div className="text-orange-600 dark:text-orange-400">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-medium text-orange-800 dark:text-orange-200">Search Taking Too Long</h3>
                                    <p className="mt-1 text-sm text-orange-700 dark:text-orange-300">{timeoutError}</p>
                                    <button
                                        onClick={() => performSearch(searchTerm, page)}
                                        className="mt-3 rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Error */}
                {error && (
                    <Card className="max-w-2xl border-destructive">
                        <CardContent className="pt-6 text-destructive">{error}</CardContent>
                    </Card>
                )}

                {/* Results */}
                {searchResults.length > 0 && (
                    <div className="w-full max-w-4xl space-y-6">
                        {/* Results indicator */}
                        <div className="flex items-center gap-3">
                            <div className="h-4 w-1 rounded bg-primary/60" />
                            <div className="text-sm text-muted-foreground">
                                {from} – {to} of {numFound} results — Page {page} of {totalPages}
                            </div>
                        </div>
                        {/* Result list */}
                        {searchResults.map((r, index) => (
                            <div
                                key={r.package_id}
                                className={cn(
                                    'space-y-1 border-l-2 pl-4 transition-colors',
                                    focusedIndex === index ? 'border-primary bg-accent/30' : 'border-transparent hover:border-primary/40',
                                )}
                            >
                                {/* Index + title */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">{start + index + 1}.</span>
                                    <a href={`${r.package_path_url}`} className="text-xl font-medium text-primary hover:underline">
                                        {/* paths/01dcf840-93bf-4184-8ebe-b9ec3261015e/a190e05d-bf15-447f-8541-4548eb8592a5/xip/AV_20160119_5C8FB688-689F-4CA8-899D-14CF4C186755 */}
                                        {r.package_name}
                                    </a>
                                </div>

                                {r.match_context && (
                                    <div className="mt-2 flex gap-3">
                                        <div
                                            className="text-sm leading-relaxed text-foreground [&_em]:font-semibold [&_em]:text-primary [&_em]:not-italic"
                                            dangerouslySetInnerHTML={{ __html: r.match_context }}
                                        />
                                    </div>
                                )}

                                {/* Metadata */}
                                <div className="flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                                    <span>Collection Code: {r.coll_display_code}</span>
                                    <span>
                                        Partner Name: {r.partner_name} ({r.partner_code})
                                    </span>
                                </div>
                            </div>
                        ))}

                        {/* Pagination indicator */}
                        {totalPages > 1 && (
                            <div className="flex items-center gap-4 pt-4 text-sm text-muted-foreground">
                                <button
                                    disabled={page <= 1}
                                    onClick={() => performSearch(searchTerm, page - 1)}
                                    className="flex items-center gap-1 disabled:opacity-40"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Previous
                                </button>

                                <span>
                                    Page <strong>{page}</strong> of {totalPages}
                                </span>

                                <button
                                    disabled={page >= totalPages}
                                    onClick={() => performSearch(searchTerm, page + 1)}
                                    className="flex items-center gap-1 disabled:opacity-40"
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {!isLoading && searchTerm && searchResults.length === 0 && !error && (
                    <div className="text-muted-foreground">No results found for "{searchTerm}"</div>
                )}
            </div>
        </AppLayout>
    );
}
