import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Loader2, Package, Search } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface SearchResult {
    package_id: string;
    package_name: string;
    coll_code: string;
    coll_id: string;
    coll_display_code: string;
    coll_rel_path: string;
    coll_path: string;
    package_type: string;
    package_state: string;
    partner_code: string;
    partner_name: string;
    package_path_url: string;
}

interface SearchPageProps {
    term: string;
    results: SearchResult[];
    numFound: number;
    start: number;
    error?: string;
    page?: number;
    totalPages?: number;
}


export default function SearchIndex() {

    const {
      term,
      results,
      numFound,
      start,
      error,
      page = 1,
      totalPages = 1,
    } = usePage<SearchPageProps>().props;


    const [searchTerm, setSearchTerm] = useState(term ?? '');
    const [searchResults, setSearchResults] = useState<SearchResult[]>(results ?? []);
    const [isLoading, setIsLoading] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

    const from = numFound === 0 ? 0 : start + 1;

    const to = Math.min(start + searchResults.length, numFound);

    const inputRef = useRef<HTMLInputElement>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Partners', href: '/' },
        { title: 'Search', href: '/search' },
    ];

    const performSearch = (query: string, targetPage = 1) => {
        if (!query.trim()) return;

        setIsLoading(true);
        router.get(
            '/search',
            { term: query, page: targetPage },
            {
                preserveState: true,
                onFinish: () => setIsLoading(false),
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

            <div
                className="flex flex-col gap-6 px-6 py-4"
                onKeyDown={handleResultKeyNav}
                tabIndex={0}
            >
                {/* Search */}
                <div className="w-full max-w-2xl">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            performSearch(searchTerm);
                        }}
                        className="relative"
                    >
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                        <Input
                            ref={inputRef}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search..."
                            className="h-12 pl-10 pr-10"
                        />

                        {isLoading && (
                            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" />
                        )}
                    </form>
                </div>

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
                                    focusedIndex === index
                                        ? 'border-primary bg-accent/30'
                                        : 'border-transparent hover:border-primary/40',
                                )}
                            >
                                {/* Index + title */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">
                                        {index + 1}.
                                    </span>
                                    <a
                                        href={`${r.package_path_url}`}
                                        className="text-xl font-medium text-primary hover:underline"
                                    >
                                        {/* paths/01dcf840-93bf-4184-8ebe-b9ec3261015e/a190e05d-bf15-447f-8541-4548eb8592a5/xip/AV_20160119_5C8FB688-689F-4CA8-899D-14CF4C186755 */}
                                        {r.package_name}
                                    </a>
                                </div>

                                {/* Metadata */}
                                <div className="flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                                    <span>Collection Code: {r.coll_display_code}</span>
                                    <span>Partner Name: {r.partner_name} ({r.partner_code})</span>
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
                    <div className="text-muted-foreground">
                        No results found for “{searchTerm}”
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
