import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import WorkflowDialogTrigger from '@/components/WorkflowDialogTrigger';
import type { FileItem, Workflow } from '@/types';
import { useState } from 'react';

const DOWNLOAD_ACTION = 'download';
const workflowActionValue = (workflow: Workflow) => `workflow:${workflow.workflow_id}`;

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
}: {
    item: FileItem;
    workflows: Workflow[];
    pathSegments?: string[];
    partnerName?: string;
    collectionName?: string;
    downloadable: boolean;
}) => {
    const sizeLabel = item.object_type === 'file' && item.display_size ? ` (${item.display_size})` : '';
    const [activeWorkflow, setActiveWorkflow] = useState<Workflow | null>(null);

    const options: Array<{ value: string; label: string }> = [];

    if (downloadable && item.download_url) {
        options.push({ value: DOWNLOAD_ACTION, label: `Download${sizeLabel}` });
    }

    workflows.forEach((workflow) => {
        options.push({ value: workflowActionValue(workflow), label: workflow.description || workflow.workflow_id });
    });

    const handleValueChange = async (value: string) => {

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
            <Select value="" onValueChange={handleValueChange}>
                <SelectTrigger className="w-45">
                    <SelectValue placeholder="Select action..." />
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
        </>
    );
};

export default FileActionsCell;
