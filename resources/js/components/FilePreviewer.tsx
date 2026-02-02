import BasicAudioPlayer from '@/components/BasicAudioPlayer';
import BasicVideoPlayer from '@/components/BasicVideoPlayer';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import formatContent from '@/lib/formatContent';
import type { FilePreviewerProps } from '@/types';
import { Loader2 } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { Toaster, toast } from 'sonner';

const FilePreviewer: React.FC<FilePreviewerProps> = ({ item }) => {
    const [fileContent, setFileContent] = useState<string>('');
    const [fileType, setFileType] = useState<string>(''); // 'json', 'xml', 'text', 'audio', 'video', or empty
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Get the file URL, which will be the PHP stream endpoint.
    const fileUrl = useMemo(() => item?.download_url, [item]);

    useEffect(() => {
        const fetchFileContent = async () => {
            if (!fileUrl) {
                setError('A download URL was not provided.');
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setFileContent('');
            setFileType('');
            setError(null);

            try {
                // Determine file type first based on mime_type
                if (item.mime_type === 'application/json') {
                    setFileType('json');
                } else if (item.mime_type === 'application/xml') {
                    setFileType('xml');
                } else if (item.mime_type?.startsWith('audio/')) {
                    setFileType('audio');
                    setIsLoading(false);
                    return;
                } else if (item.mime_type?.startsWith('video/')) {
                    setFileType('video');
                    setIsLoading(false);
                    return;
                } else {
                    // Default to 'text' for any other unknown text-like types
                    setFileType('text');
                }

                // Only fetch content for text-based files (JSON, XML, plain text)
                const response = await fetch(fileUrl);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const content = await response.text();
                setFileContent(content);
            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : String(e);
                setError(`Failed to load file: ${message}`);
                toast.error('Failed to load file.', {
                    description: message,
                });
                setFileContent('');
                setFileType('');
            } finally {
                if (fileType !== 'audio' && fileType !== 'video') {
                    setIsLoading(false);
                }
            }
        };

        fetchFileContent();
    }, [item, fileUrl, fileType]);

    return (
        <div>
            <Card className="rounded-lg shadow-lg">
                <CardContent className="p-6">
                    {isLoading && (
                        <div className="flex min-h-[200px] items-center justify-center text-gray-500">
                            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                            Loading file content...
                        </div>
                    )}
                    {error && <div className="py-4 text-center text-red-600">Error: {error}</div>}
                    {!isLoading && !error && (
                        <>
                            {fileType === 'audio' && fileUrl ? (
                                <BasicAudioPlayer src={fileUrl} type={item?.mime_type || 'audio/mpeg'} />
                            ) : fileType === 'video' && fileUrl ? (
                                <BasicVideoPlayer src={fileUrl} type={item?.mime_type || 'video/mp4'} />
                            ) : fileContent ? (
                                <div className="relative overflow-hidden rounded-md border border-gray-300">
                                    <Textarea
                                        value={formatContent(fileContent, fileType)}
                                        readOnly
                                        className="min-h-[400px] w-full resize-none border-none bg-gray-50 p-4 font-mono text-sm text-gray-900 focus-visible:ring-0"
                                        aria-label="File content preview"
                                        spellCheck="false"
                                    />
                                </div>
                            ) : (
                                item?.download_url && (
                                    <div className="py-4 text-center text-gray-500">
                                        No content found at the provided URL or content is empty.
                                        {(fileType === 'audio' || fileType === 'video') && ' (Media will attempt to stream directly.)'}
                                    </div>
                                )
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
            <Toaster />
        </div>
    );
};

export default FilePreviewer;
