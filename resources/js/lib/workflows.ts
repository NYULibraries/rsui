import type { AvailableWorkflows, FileItem, Workflow } from '@/types';

/**
 * Normalizes a mime type for comparison by dropping any parameters
 * (e.g. `text/plain; charset=utf-8`) and lowercasing the result.
 */
const normalizeMimeType = (mimeType: string): string => mimeType.split(';')[0].trim().toLowerCase();

/**
 * Returns true when a mime type satisfies a pattern advertised by the API.
 * Patterns may be exact (`video/mp4`), a subtype wildcard (`video/*`), or `*`.
 */
const matchesMimePattern = (mimeType: string, pattern: string): boolean => {
    const normalizedPattern = normalizeMimeType(pattern);

    if (normalizedPattern === '*' || normalizedPattern === '*/*') {
        return true;
    }

    if (normalizedPattern.endsWith('/*')) {
        return mimeType.startsWith(`${normalizedPattern.slice(0, -1)}`);
    }

    return mimeType === normalizedPattern;
};

/**
 * A stable identity for a workflow, used for de-duplication and select values.
 */
export const getWorkflowKey = (workflow: Workflow): string => `${workflow.workflow_id}:${workflow.version}`;

/**
 * Human readable label for a workflow action.
 */
export const workflowLabel = (workflow: Workflow): string => workflow.description || workflow.workflow_id;

/**
 * Determines whether a workflow may be applied to a given item.
 *
 * The API advertises eligibility via `applies_to.object_types` and, for workflows that
 * only accept certain payloads (such as transcode and push), `applies_to.mime_types`.
 * The mime restriction only constrains files, since directories carry no mime type.
 * A workflow that omits `mime_types` is treated as unrestricted.
 */
export const workflowAppliesToItem = (workflow: Workflow, item: FileItem): boolean => {
    const objectTypes = workflow.applies_to?.object_types ?? [];

    if (!objectTypes.includes(item.object_type)) {
        return false;
    }

    const mimeTypes = workflow.applies_to?.mime_types ?? [];

    if (mimeTypes.length === 0 || item.object_type !== 'file') {
        return true;
    }

    if (!item.mime_type) {
        return false;
    }

    const itemMimeType = normalizeMimeType(item.mime_type);

    return mimeTypes.some((pattern) => matchesMimePattern(itemMimeType, pattern));
};

/**
 * Collects every workflow advertised for an item and filters it down to the
 * workflows that are actually applicable, removing duplicates.
 */
export const getApplicableWorkflows = (availableWorkflows: AvailableWorkflows | undefined, item: FileItem): Workflow[] => {
    const candidates = [...(availableWorkflows?.directory ?? []), ...(availableWorkflows?.file ?? [])];

    return mergeWorkflows(candidates.filter((workflow) => workflowAppliesToItem(workflow, item)));
};

/**
 * Merges workflow lists, preserving order and removing duplicates.
 */
export const mergeWorkflows = (...workflowLists: Workflow[][]): Workflow[] => {
    const seen = new Set<string>();
    const workflows: Workflow[] = [];

    workflowLists.flat().forEach((workflow) => {
        const key = getWorkflowKey(workflow);

        if (!seen.has(key)) {
            seen.add(key);
            workflows.push(workflow);
        }
    });

    return workflows;
};
