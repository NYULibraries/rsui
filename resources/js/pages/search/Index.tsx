import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Loader2, Package, Search } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface SearchResult {
    id: string;
    name: string;
    description?: string;
    type?: string;
    metadata?: Record<string, unknown>;
}

interface SearchPageProps {
    term: string;
    results: SearchResult[];
    error?: string;
    [key: string]: unknown;
}

export default function SearchIndex() {
    const { term, results, error } = usePage<SearchPageProps>().props;
    const [searchTerm, setSearchTerm] = useState(term || '');
    const [searchResults, setSearchResults] = useState<SearchResult[]>(results || []);
    const [isLoading, setIsLoading] = useState(false);
    const [showAutocomplete, setShowAutocomplete] = useState(false);
    const [autocompleteResults, setAutocompleteResults] = useState<SearchResult[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<HTMLDivElement>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Search',
            href: '/search',
        },
    ];

    const performSearch = (query: string) => {
        if (!query.trim()) return;

        setIsLoading(true);
        router.get(
            '/search',
            { term: query },
            {
                preserveState: true,
                onFinish: () => setIsLoading(false),
            },
        );
    };

    const fetchAutocomplete = async (query: string) => {
        if (query.length < 2) {
            setAutocompleteResults([]);
            setShowAutocomplete(false);
            return;
        }

        try {
            const response = await fetch(`/api/search/autocomplete?term=${encodeURIComponent(query)}`);
            const data = await response.json();
            setAutocompleteResults(data || []);
            setShowAutocomplete(true);
            setSelectedIndex(-1);
        } catch (error) {
            console.error('Autocomplete error:', error);
            setAutocompleteResults([]);
            setShowAutocomplete(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchTerm(value);

        if (value.length >= 2) {
            fetchAutocomplete(value);
        } else {
            setAutocompleteResults([]);
            setShowAutocomplete(false);
        }
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showAutocomplete || autocompleteResults.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex((prev) => (prev < autocompleteResults.length - 1 ? prev + 1 : prev));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex((prev) => (prev > -1 ? prev - 1 : -1));
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && autocompleteResults[selectedIndex]) {
                    const selectedResult = autocompleteResults[selectedIndex];
                    setSearchTerm(selectedResult.name);
                    setShowAutocomplete(false);
                    performSearch(selectedResult.name);
                } else {
                    performSearch(searchTerm);
                }
                break;
            case 'Escape':
                setShowAutocomplete(false);
                setSelectedIndex(-1);
                break;
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setShowAutocomplete(false);
        performSearch(searchTerm);
    };

    const handleAutocompleteClick = (result: SearchResult) => {
        setSearchTerm(result.name);
        setShowAutocomplete(false);
        performSearch(result.name);
    };

    const handleClickOutside = (event: MouseEvent) => {
        if (
            autocompleteRef.current &&
            !autocompleteRef.current.contains(event.target as Node) &&
            inputRef.current &&
            !inputRef.current.contains(event.target as Node)
        ) {
            setShowAutocomplete(false);
        }
    };

    useEffect(() => {
        setSearchResults(results || []);
    }, [results]);

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Search" />
            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4">
                <div className="mx-auto w-full max-w-2xl">
                    <form onSubmit={handleSubmit} className="relative">
                        <div className="relative">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                            <Input
                                ref={inputRef}
                                type="text"
                                placeholder="Search packages..."
                                value={searchTerm}
                                onChange={handleInputChange}
                                onKeyDown={handleInputKeyDown}
                                className="h-12 pr-12 pl-10 text-base"
                                disabled={isLoading}
                            />
                            {isLoading && (
                                <Loader2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 transform animate-spin text-muted-foreground" />
                            )}
                        </div>

                        {showAutocomplete && autocompleteResults.length > 0 && (
                            <div
                                ref={autocompleteRef}
                                className="absolute top-full right-0 left-0 z-50 mt-1 max-h-60 overflow-auto rounded-md border bg-popover shadow-lg"
                            >
                                {autocompleteResults.map((result, index) => (
                                    <div
                                        key={result.id}
                                        className={cn(
                                            'flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-accent hover:text-accent-foreground',
                                            selectedIndex === index && 'bg-accent text-accent-foreground',
                                        )}
                                        onClick={() => handleAutocompleteClick(result)}
                                    >
                                        <Package className="h-4 w-4 text-muted-foreground" />
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate font-medium">{result.name}</div>
                                            {result.description && <div className="truncate text-sm text-muted-foreground">{result.description}</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </form>
                </div>

                {error && (
                    <Card className="mx-auto w-full max-w-2xl border-destructive">
                        <CardContent className="pt-6">
                            <div className="text-destructive">{error}</div>
                        </CardContent>
                    </Card>
                )}

                {searchResults.length > 0 && (
                    <div className="mx-auto w-full max-w-4xl">
                        <h2 className="mb-4 text-2xl font-semibold">Search Results ({searchResults.length})</h2>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {searchResults.map((result) => (
                                <Card key={result.id} className="transition-shadow hover:shadow-md">
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <CardTitle className="flex items-center gap-2 text-lg">
                                                <Package className="h-5 w-5 text-muted-foreground" />
                                                {result.name}
                                            </CardTitle>
                                            {result.type && <Badge variant="secondary">{result.type}</Badge>}
                                        </div>
                                        {result.description && <CardDescription className="line-clamp-2">{result.description}</CardDescription>}
                                    </CardHeader>
                                    <CardContent>
                                        {result.metadata && Object.keys(result.metadata).length > 0 && (
                                            <div className="space-y-2">
                                                {Object.entries(result.metadata)
                                                    .slice(0, 3)
                                                    .map(([key, value]) => (
                                                        <div key={key} className="flex justify-between text-sm">
                                                            <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}:</span>
                                                            <span className="font-medium">{String(value)}</span>
                                                        </div>
                                                    ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {searchTerm && !isLoading && searchResults.length === 0 && !error && (
                    <div className="mx-auto w-full max-w-2xl text-center">
                        <div className="text-muted-foreground">No results found for "{searchTerm}"</div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
