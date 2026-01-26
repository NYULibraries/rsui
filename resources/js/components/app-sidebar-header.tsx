import { Breadcrumbs } from '@/components/breadcrumbs';
import { Input } from '@/components/ui/input';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface SearchResult {
    id: string;
    name: string;
    description?: string;
    type?: string;
}

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [showAutocomplete, setShowAutocomplete] = useState(false);
    const [autocompleteResults, setAutocompleteResults] = useState<SearchResult[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<HTMLDivElement>(null);

    const currentUrl = usePage().url;

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
        if (!showAutocomplete || autocompleteResults.length === 0) {
            if (e.key === 'Enter' && searchTerm.trim()) {
                e.preventDefault();
                performSearch(searchTerm);
            }
            return;
        }

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

    const performSearch = (query: string) => {
        if (!query.trim()) return;

        setShowAutocomplete(false);
        router.get('/search', { term: query });
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
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Clear search when navigating away from search page
    useEffect(() => {
        if (!currentUrl.startsWith('/search')) {
            setSearchTerm('');
            setShowAutocomplete(false);
            setAutocompleteResults([]);
        }
    }, [currentUrl]);

    return (
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border/50 px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex flex-1 items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>

            <div className="relative max-w-sm flex-1">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                <Input
                    ref={inputRef}
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={handleInputChange}
                    onKeyDown={handleInputKeyDown}
                    className="h-9 pr-3 pl-10 text-sm"
                />

                {showAutocomplete && autocompleteResults.length > 0 && (
                    <div
                        ref={autocompleteRef}
                        className="absolute top-full right-0 left-0 z-50 mt-1 max-h-60 overflow-auto rounded-md border bg-popover shadow-lg"
                    >
                        {autocompleteResults.map((result, index) => (
                            <div
                                key={result.id}
                                className={cn(
                                    'cursor-pointer px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground',
                                    selectedIndex === index && 'bg-accent text-accent-foreground',
                                )}
                                onClick={() => handleAutocompleteClick(result)}
                            >
                                <div className="font-medium">{result.name}</div>
                                {result.description && <div className="truncate text-muted-foreground">{result.description}</div>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </header>
    );
}
