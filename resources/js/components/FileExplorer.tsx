import FilePreviewDialogTrigger from '@/components/FilePreviewDialogTrigger'; // Adjust path
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { FileItem, Storage } from '@/types';
import { ChevronRight, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

const FileExplorer = ({ storage, partnerId, collectionId }: { storage: Storage[]; partnerId: string; collectionId: string }) => {
    const [currentData, setCurrentData] = useState<FileItem | null>(null);
    const [selected, setSelected] = useState<string | null>(null);
    const [history, setHistory] = useState<FileItem[]>([]);
    const [filter, setFilter] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (storage && storage.length > 0) {
            // The last item from the 'storage' prop is the initial current directory
            const initialCurrentDirectory = storage[storage.length - 1];

            // All items *before* the last one form the initial history.
            // We need to ensure these items (from 'storage') are treated as FileItem and have a 'url'.
            const initialHistoryItems: FileItem[] = storage.slice(0, storage.length - 1).filter((item): item is FileItem => !!(item as FileItem).url); // Filter out any history items without a URL

            // Fetch data for the initial current directory. This item MUST have a URL.
            fetchData(initialCurrentDirectory);
            setHistory(initialHistoryItems);
            setSelected(null);
            setFilter('');
        }
    }, [storage]);

    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (event.state) {
                setHistory(event.state.history);
                setCurrentData(event.state.currentData);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    useEffect(() => {
        if (currentData && currentData.url) {
            const baseUrlPart = `/fs/paths/${partnerId}/${collectionId}`;
            let newPath = '';

            if (currentData.url === baseUrlPart) {
                // This is the collection root
                newPath = `/collections/${collectionId}`;
            } else if (currentData.url.startsWith(baseUrlPart + '/')) {
                // This is a sub-path
                const pathSegments = currentData.url.substring(baseUrlPart.length + 1);
                newPath = `/paths/${partnerId}/${collectionId}/${pathSegments}`;
            } else {
                // Fallback to collection root if URL structure is unexpected
                newPath = `/collections/${collectionId}`;
            }
            window.history.pushState({ history, currentData }, '', newPath);
        }
    }, [currentData, history, partnerId, collectionId, storage]);

    const fetchData = async (itemToFetch: { url: string }) => {
        setLoading(true);
        try {
            // Defensive check: Ensure itemToFetch.url is always a string here
            if (!itemToFetch.url) {
                console.error('Error: Attempted to fetch data for an item with no URL:', itemToFetch);
                return; // Prevent making a request with an undefined URL
            }
            const res = await fetch(itemToFetch.url);
            const data = await res.json();
            setCurrentData(data);
        } finally {
            setLoading(false);
        }
    };

    const handleClick = async (item: FileItem) => {
        if (item.object_type === 'directory') {
            setLoading(true);
            // Defensive check: A clicked directory MUST have a URL to navigate into it
            if (!item.url) {
                console.error('Error: Clicked directory has no URL:', item);
                setLoading(false);
                return;
            }

            const res = await fetch(item.url);
            const data = await res.json();

            if (currentData) {
                if (currentData.object_type === 'directory' && !currentData.url) {
                    console.warn('Warning: Attempting to add a directory to history without a URL:', currentData);
                }
                setHistory((prev) => [...prev, currentData]);
            }
            setCurrentData(data);
            setFilter('');
            setSelected(null);
            setLoading(false);
        } else {
            setSelected(item.name);
        }
    };

    const goToIndex = async (index: number) => {
        setLoading(true);
        // The target item to navigate to is the one at the clicked index in the 'history' array
        const targetItem: FileItem = history[index];

        // Defensive check: Ensure the target history item is valid and has a URL
        if (!targetItem || !targetItem.url) {
            console.error('Error: Target history item has no URL or is null:', targetItem);
            setLoading(false);
            return;
        }

        // Slice history up to the clicked index to form the new history
        const newHistory = history.slice(0, index);

        // Pass the target item to fetchData
        await fetchData(targetItem); // fetchData expects an item with a 'url'

        setHistory(newHistory);
        setSelected(null);
        setFilter('');
        setLoading(false);
    };

    const formatDate = (iso: string) => new Date(iso).toLocaleString();

    const isDownloadable = (item: FileItem) => item.object_type === 'file' && item.size !== undefined && item.size < 2 * 1024 * 1024 * 1024; // Less than 2GB

    if (loading) {
        return <LoadingSkeleton />;
    }

    if (!currentData) {
        return <div className="p-4 text-center text-muted-foreground">No data</div>;
    }

    const filteredChildren = (currentData.children || []).filter((item: FileItem) => item.name.toLowerCase().includes(filter.toLowerCase()));

    return (
        <div className="p-4">
            <div className="mb-2 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
                <span className="font-semibold">Path:</span>
                {history.map((h, i) => (
                    <span key={h.url || i} className="flex items-center">
                        {h.url ? (
                            <button
                                onClick={() => goToIndex(i)}
                                className="cursor-pointer text-primary underline hover:text-primary/80"
                                title={h.name}
                            >
                                {h.name}
                            </button>
                        ) : (
                            <span className="text-muted-foreground" title={`Unnavigable: ${h.name}`}>
                                {h.name}
                            </span>
                        )}
                        <ChevronRight className="mx-1 h-4 w-4 text-muted-foreground/50" />
                    </span>
                ))}
                {currentData.name && <span title={currentData.name}>{currentData.name}</span>}
            </div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Filter files or folders..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            {filteredChildren.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">Empty directory.</div>
            ) : (
                <div className="overflow-x-auto rounded-md border">
                    <table className="min-w-full text-sm">
                        <thead className="sticky top-0 z-10 bg-muted text-left">
                            <tr>
                                <th className="p-2 font-medium">Name</th>
                                <th className="p-2 font-medium">Type</th>
                                <th className="p-2 font-medium">Size</th>
                                <th className="p-2 font-medium">Preview</th>
                                <th className="p-2 font-medium">Download</th>
                                <th className="p-2 font-medium">Last Modified</th>
                                <th className="p-2 font-medium"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredChildren.map((item: FileItem, index: number) => {
                                const isEven = index % 2 === 0;
                                const rowClasses = cn(
                                    isEven ? 'bg-background' : 'bg-muted/50',
                                    'hover:bg-accent',
                                    item.object_type === 'directory' && 'cursor-pointer',
                                    selected === item.name && 'ring ring-primary',
                                );

                                console.log(item);

                                item.preview = false;

                                // Set preview to true for specific mime types
                                if (item.size && item.size > 0 && item.mime_type) {
                                    switch (item.mime_type) {
                                        case 'application/xml':
                                        case 'application/json':
                                        case 'text/plain':
                                        case 'text/csv':
                                        case 'text/xsl':
                                        case 'application/xslt+xml':
                                        case 'audio/wav':
                                        case 'audio/mpeg':
                                        case 'audio/ogg':
                                        case 'audio/aac':
                                        case 'video/mp4':
                                        case 'video/webm':
                                        case 'video/ogg':
                                        case 'text/html':
                                            item.preview = true;
                                            break;
                                    }
                                }

                                const is_empty_dir = item.is_empty_dir === true;

                                if (item.object_type === 'file') {
                                    return (
                                        <tr key={item.name} className={rowClasses} tabIndex={0}>
                                            <td className="max-w-xs p-2" title={item.name}>
                                                {item.name}
                                            </td>
                                            <td className="p-2">{item.object_type}</td>
                                            <td className="p-2">{item.display_size}</td>
                                            <td className="p-2">
                                                {item.preview && item.download_url ? (
                                                    <FilePreviewDialogTrigger item={item} triggerLabel="Preview" />
                                                ) : (
                                                    <div>
                                                        <HoverCard>
                                                            <HoverCardTrigger>
                                                                <span className="text-muted-foreground/50">Not available</span>
                                                            </HoverCardTrigger>
                                                            <HoverCardContent>
                                                                <span>Unavailable at the moment — please check back soon.</span>
                                                            </HoverCardContent>
                                                        </HoverCard>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-2">
                                                {isDownloadable(item) && item.download_url ? (
                                                    <a
                                                        href={item.download_url}
                                                        className="text-primary hover:underline"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        Download
                                                    </a>
                                                ) : (
                                                    <HoverCard>
                                                        <HoverCardTrigger>
                                                            <span className="text-muted-foreground/50">N/A</span>
                                                        </HoverCardTrigger>
                                                        <HoverCardContent>
                                                            <span>Download for files over 2GB of size is not currently supported.</span>
                                                        </HoverCardContent>
                                                    </HoverCard>
                                                )}
                                            </td>
                                            <td className="p-2">{formatDate(item.last_modified)}</td>
                                            <td className="p-2"></td>
                                        </tr>
                                    );
                                } else if (item.object_type === 'directory') {
                                    let object_type = 'directory';
                                    if (is_empty_dir) {
                                        object_type = 'empty directory';
                                    }
                                    return (
                                        <tr key={item.name} className={rowClasses} onClick={() => handleClick(item)} tabIndex={0}>
                                            <td className="max-w-xs truncate p-2" title={item.name}>
                                                {item.name}
                                            </td>
                                            <td className="p-2">{object_type}</td>
                                            <td className="p-2"></td>
                                            <td className="p-2"></td>
                                            <td className="p-2"></td>
                                            <td className="p-2">{formatDate(item.last_modified)}</td>
                                            <td className="p-2">
                                                <ChevronRight size={24} className="text-gray-400" />
                                            </td>
                                        </tr>
                                    );
                                }
                                return null;
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default FileExplorer;
