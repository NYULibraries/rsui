import { Breadcrumbs } from '@/components/breadcrumbs';
import { Input } from '@/components/ui/input';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    const [searchTerm, setSearchTerm] = useState('');

    const page = usePage();
    const currentUrl = page.url;

    // Get search term from URL parameters
    useEffect(() => {
        if (currentUrl.includes('/search') && currentUrl.includes('term=')) {
            const urlParams = new URLSearchParams(currentUrl.split('?')[1] || '');
            const term = urlParams.get('term') || '';
            setSearchTerm(term);
        } else {
            setSearchTerm('');
        }
    }, [currentUrl]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && searchTerm.trim()) {
            e.preventDefault();

            router.get(
                '/search',
                { term: searchTerm.trim() },
                {
                    onError: (errors) => {
                        console.error('Search navigation error:', errors);
                        // Optionally show error message to user
                    },
                    preserveState: false,
                    preserveScroll: false,
                },
            );
        }
    };

    return (
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border/50 px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex flex-1 items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>

            <div className="relative max-w-sm flex-1">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                <Input
                    type="text"
                    placeholder="Search for an identifier..."
                    value={searchTerm}
                    onChange={handleInputChange}
                    onKeyDown={handleInputKeyDown}
                    className="h-9 pr-3 pl-10 text-sm"
                />
            </div>
        </header>
    );
}
