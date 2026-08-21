import FilePreviewDialogTrigger from '@/components/FilePreviewDialogTrigger';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import WorkflowDialogTrigger from '@/components/WorkflowDialogTrigger';
import { apiFetchText } from '@/lib/api';
import type { FileItem, Workflow } from '@/types';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

const DOWNLOAD_ACTION = 'download';
const PREVIEW_ACTION = 'preview';
const workflowActionValue = (workflow: Workflow) => `workflow:${workflow.workflow_id}`;

type PreloadedContent = { content: string; fileType: string };

const resolveFileType = (mimeType?: string): string => {
    if (mimeType === 'application/json') return 'json';
    if (mimeType === 'application/xml' || mimeType === 'application/xslt+xml' || mimeType === 'text/xsl') return 'xml';
    if (mimeType?.startsWith('audio/')) return 'audio';
    if (mimeType?.startsWith('video/')) return 'video';
    return 'text';
};

/**
 * Renders the available actions for a file or directory row as a select dropdown.
 * The set of choices is driven entirely by the item's download eligibility, preview
 * eligibility, and the workflows advertised by the API (via `available_workflows`), so
 * new workflows show up automatically without any FileExplorer changes.
 */
const FileActionsCell = ({
    item,
    workflows,
    pathSegments = [],
    partnerName,
    collectionName,
    downloadable,
    previewable,
}: {
    item: FileItem;
    workflows: Workflow[];
    pathSegments?: string[];
    partnerName?: string;
    collectionName?: string;
    downloadable: boolean;
    previewable: boolean;
}) => {
    const sizeLabel = item.object_type === 'file' && item.display_size ? ` (${item.display_size})` : '';
    const [activeWorkflow, setActiveWorkflow] = useState<Workflow | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [preloadedContent, setPreloadedContent] = useState<PreloadedContent | null>(null);

    const options: Array<{ value: string; label: string }> = [];

    if (previewable && item.download_url) {
        options.push({ value: PREVIEW_ACTION, label: `Preview${sizeLabel}` });
    }

    if (downloadable && item.download_url) {
        options.push({ value: DOWNLOAD_ACTION, label: `Download${sizeLabel}` });
    }

    workflows.forEach((workflow) => {
        options.push({ value: workflowActionValue(workflow), label: workflow.description || workflow.workflow_id });
    });

    const handleValueChange = async (value: string) => {
        if (value === PREVIEW_ACTION) {
            const fileType = resolveFileType(item.mime_type);
            const isMediaType = fileType === 'audio' || fileType === 'video';

            if (!isMediaType && item.download_url) {
                // Pre-fetch text-based content before opening the dialog to avoid
                // the dialog resizing as content loads.
                setPreviewLoading(true);
                try {
                    const content = await apiFetchText(item.download_url);
                    setPreloadedContent({ content, fileType });
                } catch {
                    setPreloadedContent({ content: '', fileType });
                } finally {
                    setPreviewLoading(false);
                }
            } else {
                // Media types stream directly — no pre-fetch needed.
                setPreloadedContent({ content: '', fileType });
            }

            setPreviewOpen(true);
            return;
        }

        if (value === DOWNLOAD_ACTION) {
            if (item.download_url) {
                window.open(item.download_url, '_blank', 'noopener,noreferrer');
            }
            return;
        }

        const workflow = workflows.find((w) => workflowActionValue(w) === value);
        if (workflow) {
            setActiveWorkflow(workflow);
        }
    };

    if (options.length === 0) {
        return (
            <HoverCard>
                <HoverCardTrigger>
                    <span className="text-muted-foreground/50">N/A</span>
                </HoverCardTrigger>
                <HoverCardContent>
                    <span>No actions are currently available for this item.</span>
                </HoverCardContent>
            </HoverCard>
        );
    }

    return (
        <>
            {/* The Select always shows a placeholder; picking an option immediately triggers the
                corresponding action (download or open a workflow dialog) rather than persisting a value. */}
            <Select value="" onValueChange={handleValueChange} disabled={previewLoading}>
                <SelectTrigger className="w-45">
                    {previewLoading ? (
                        <span className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading preview...
                        </span>
                    ) : (
                        <SelectValue placeholder="Select action..." />
                    )}
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {activeWorkflow && (
                <WorkflowDialogTrigger
                    item={item}
                    workflow={activeWorkflow}
                    workflows={workflows}
                    pathSegments={pathSegments}
                    partnerName={partnerName}
                    collectionName={collectionName}
                    open={!!activeWorkflow}
                    onOpenChange={(open) => {
                        if (!open) {
                            setActiveWorkflow(null);
                        }
                    }}
                />
            )}
            {previewable && (
                <FilePreviewDialogTrigger
                    item={item}
                    open={previewOpen}
                    onOpenChange={(open) => {
                        setPreviewOpen(open);
                        if (!open) setPreloadedContent(null);
                    }}
                    preloadedContent={preloadedContent}
                />
            )}
        </>
    );
};

export default FileActionsCell;
