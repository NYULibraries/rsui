import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { apiFetch } from '@/lib/api';
import { Building2, ChevronRight, File as FileIcon, Folder, Library } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { getApplicableWorkflows, getWorkflowKey, mergeWorkflows, workflowAppliesToItem, workflowLabel } from '@/lib/workflows';
import type { FileItem, Workflow, WorkflowDialogTriggerProps, WorkflowParameter, WorkflowParameterOption } from '@/types';

const WORKFLOW_TOAST_OPTIONS = {
    duration: 5000,
    position: 'top-right',
} as const;

const getSelectedWorkflowKey = (selectedWorkflow: Workflow | undefined, workflows: Workflow[]): string => {
    if (!selectedWorkflow) {
        return '';
    }

    return workflows.find((workflow) => getWorkflowKey(workflow) === getWorkflowKey(selectedWorkflow)) ? getWorkflowKey(selectedWorkflow) : '';
};

const getItemValue = (item: FileItem, key: string): string => {
    if (!(key in item)) {
        return '';
    }

    const value = item[key as keyof FileItem];

    if (typeof value === 'string') {
        return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    return '';
};

/**
 * Compiles a workflow parameter's regex pattern. `pattern` is a free-text string supplied by the
 * workflow profile API (e.g. `^[a-zA-Z0-9_-]+[a-zA-Z0-9_.-]*$` for "Target subdirectory"), not a
 * value we control, so a future/misconfigured profile could send a string `new RegExp()` can't
 * compile (a typo, or syntax valid in another regex engine but not JS). `new RegExp()` throws a
 * `SyntaxError` in that case, so this falls back to `null` ("no pattern to validate against")
 * instead of crashing the dialog or blocking submission over an API-side formatting issue.
 */
const compileParameterPattern = (pattern: string | undefined): RegExp | null => {
    if (!pattern) {
        return null;
    }

    try {
        return new RegExp(pattern);
    } catch {
        return null;
    }
};

const isParameterValueValid = (parameter: WorkflowParameter, value: string): boolean => {
    const trimmed = value.trim();

    if (parameter.required && trimmed.length === 0) {
        return false;
    }

    const regex = compileParameterPattern(parameter.pattern);

    if (regex && value.length > 0 && !regex.test(value)) {
        return false;
    }

    return true;
};

const getParameterError = (parameter: WorkflowParameter, value: string): string | undefined => {
    const trimmed = value.trim();

    if (parameter.required && trimmed.length === 0) {
        return 'This field is required.';
    }

    const regex = compileParameterPattern(parameter.pattern);

    if (regex && value.length > 0 && !regex.test(value)) {
        return `Value does not match the required format (${parameter.pattern}).`;
    }

    return undefined;
};

const resolveContextParameter = (parameter: WorkflowParameter, item: FileItem): string => {
    const bindingValue = parameter.binding ? getItemValue(item, parameter.binding) : '';

    if (bindingValue) {
        return bindingValue;
    }

    if (parameter.name === 'source_path') {
        return item.url || item.path || item.name;
    }

    return getItemValue(item, parameter.name);
};

/**
 * Renders a trigger (link/button) that opens a dialog for a workflow (e.g. "push_rw_flow"),
 * letting the user fill in the user-provided parameters before submitting.
 */
const WorkflowDialogTrigger: React.FC<WorkflowDialogTriggerProps> = ({
    item,
    workflow: initialWorkflow,
    workflows: initialWorkflows = [],
    pathSegments = [],
    partnerName,
    collectionName,
    triggerLabel,
    open: openProp,
    onOpenChange,
}) => {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const isControlled = openProp !== undefined;
    const open = isControlled ? openProp : uncontrolledOpen;
    const setOpen = (next: boolean) => {
        if (onOpenChange) {
            onOpenChange(next);
        }
        if (!isControlled) {
            setUncontrolledOpen(next);
        }
    };
    const [submitting, setSubmitting] = useState(false);
    const [workflows, setWorkflows] = useState<Workflow[]>(initialWorkflows);
    const [selectedWorkflowId, setSelectedWorkflowId] = useState('');
    const [values, setValues] = useState<Record<string, string>>({});
    const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

    const selectedWorkflow = useMemo(
        () => workflows.find((workflow) => getWorkflowKey(workflow) === selectedWorkflowId) ?? null,
        [selectedWorkflowId, workflows],
    );

    const userParameters = useMemo(
        () => selectedWorkflow?.parameters.filter((parameter) => parameter.provided_by === 'user') ?? [],
        [selectedWorkflow],
    );

    useEffect(() => {
        if (!open) {
            setSelectedWorkflowId('');
            setValues({});
            return;
        }

        // Everything needed is already in memory: FileExplorer fetched the directory listing with
        // `?include=workflows`, so `available_workflows` is on the item (and is passed down as
        // props). Re-fetching here was a regression that broke the dialog whenever `item.url`
        // did not resolve to JSON. Workflows are re-validated so the dialog never offers (or
        // preselects) an action the item is not eligible for.
        const providedWorkflows = mergeWorkflows(initialWorkflows, initialWorkflow ? [initialWorkflow] : []).filter((workflow) =>
            workflowAppliesToItem(workflow, item),
        );
        const availableWorkflows = mergeWorkflows(providedWorkflows, getApplicableWorkflows(item.available_workflows, item));

        setWorkflows(availableWorkflows);
        setSelectedWorkflowId(getSelectedWorkflowKey(initialWorkflow, availableWorkflows));
    }, [initialWorkflow, initialWorkflows, item, open]);

    useEffect(() => {
        setValues({});
        setTouchedFields({});
    }, [selectedWorkflowId]);

    const setValue = (name: string, value: string) => {
        setValues((prev) => ({ ...prev, [name]: value }));
        setTouchedFields((prev) => ({ ...prev, [name]: true }));
    };

    const markTouched = (name: string) => {
        setTouchedFields((prev) => ({ ...prev, [name]: true }));
    };

    const isValid = userParameters.every((parameter) => isParameterValueValid(parameter, values[parameter.name] ?? ''));

    const handleSubmit = async () => {
        if (!selectedWorkflow) {
            toast.error('Select an action before submitting.', WORKFLOW_TOAST_OPTIONS);
            return;
        }

        setSubmitting(true);

        try {
            // Laravel sets an XSRF-TOKEN cookie that must be sent back as a header
            // when making non-GET requests from JavaScript (Inertia apps don't use
            // the csrf-token meta tag; they rely on the cookie/header pair).
            const xsrfToken = decodeURIComponent(
                document.cookie
                    .split('; ')
                    .find((row) => row.startsWith('XSRF-TOKEN='))
                    ?.split('=')[1] ?? '',
            );

            const data = await apiFetch<{ data?: { job_id?: string }; message?: string }>('/api/workflows/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': xsrfToken,
                },
                body: JSON.stringify({
                    workflow_id: selectedWorkflow.workflow_id,
                    parameters: {
                        source_path: item.url,
                        ...Object.fromEntries(
                            selectedWorkflow.parameters
                                .filter((param) => param.provided_by === 'context')
                                .map((param) => [param.name, resolveContextParameter(param, item)]),
                        ),
                        ...Object.fromEntries(userParameters.map((param) => [param.name, values[param.name] ?? ''])),
                    },
                }),
            });
            const jobId = data?.data?.job_id;
            toast.success('Action submitted successfully.', {
                ...WORKFLOW_TOAST_OPTIONS,
                description: jobId
                    ? `Workflow "${selectedWorkflow.workflow_id}" has been queued as job ${jobId}.`
                    : (data?.message ?? `Workflow "${selectedWorkflow.workflow_id}" has been queued.`),
            });
            setOpen(false);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            toast.error('Workflow submission failed.', {
                ...WORKFLOW_TOAST_OPTIONS,
                description: message,
            });
        } finally {
            setSubmitting(false);
        }
    };

    const renderField = (parameter: WorkflowParameter) => {
        const value = values[parameter.name] ?? '';
        const touched = touchedFields[parameter.name] ?? false;
        const error = touched ? getParameterError(parameter, value) : undefined;

        if (parameter.options && parameter.options.length > 0) {
            // Options may be plain strings or `{ value, description }` objects (as advertised by
            // the API), so normalize each entry to a stable string value and display label.
            const normalizedOptions = parameter.options.map((option: string | WorkflowParameterOption) =>
                typeof option === 'string' ? { value: option, label: option } : { value: option.value, label: option.description || option.value },
            );

            return (
                <Select value={value} onValueChange={(next) => setValue(parameter.name, next)}>
                    <SelectTrigger id={parameter.name} className="w-full">
                        <SelectValue placeholder={`Select ${parameter.label ?? parameter.name}`} />
                    </SelectTrigger>
                    <SelectContent>
                        {normalizedOptions.map((option, index) => (
                            <SelectItem key={`${option.value}-${index}`} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            );
        }

        return (
            <>
                <Input
                    id={parameter.name}
                    value={value}
                    pattern={parameter.pattern}
                    required={parameter.required}
                    aria-invalid={Boolean(error)}
                    className={error ? 'border-destructive focus-visible:ring-destructive' : undefined}
                    onChange={(e) => setValue(parameter.name, e.target.value)}
                    onBlur={() => markTouched(parameter.name)}
                />
                <InputError message={error} />
            </>
        );
    };

    const isDirectory = item.object_type === 'directory' || item.is_directory === true;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {triggerLabel && (
                <DialogTrigger asChild>
                    <Button variant="link" className="h-auto cursor-pointer p-0 text-primary hover:underline" onClick={() => setOpen(true)}>
                        {triggerLabel}
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="flex h-[95vh] w-[95vw] max-w-[95vw] flex-col overflow-y-auto sm:max-w-[95vw]">
                <DialogHeader className="space-y-3">
                    {(partnerName || collectionName) && (
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                            {partnerName && (
                                <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 text-sm font-normal">
                                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-muted-foreground">Partner</span>
                                    <span className="font-medium text-foreground">{partnerName}</span>
                                </Badge>
                            )}
                            {collectionName && (
                                <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 text-sm font-normal">
                                    <Library className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-muted-foreground">Collection</span>
                                    <span className="font-medium text-foreground">{collectionName}</span>
                                </Badge>
                            )}
                        </div>
                    )}
                    <Separator />
                    <DialogTitle className="text-base font-semibold">
                        <span className="flex items-center gap-2">
                            {isDirectory ? (
                                <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                            ) : (
                                <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            )}
                            {isDirectory ? 'Directory' : 'File'}
                        </span>
                    </DialogTitle>
                    <div className="flex flex-wrap items-center gap-1 rounded-md border bg-muted/40 px-3 py-2 font-mono text-sm break-all">
                        {pathSegments.map((segment, index) => (
                            <span key={`${segment}-${index}`} className="flex items-center gap-1 text-muted-foreground">
                                {segment}
                                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                            </span>
                        ))}
                        <span className="font-medium text-foreground">{item.name}</span>
                    </div>
                    <DialogDescription className="text-sm">
                        Select an action to run against this {isDirectory ? 'directory' : 'file'}, then review and submit its parameters.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-1 flex-col gap-6 overflow-y-auto py-2">
                    <div className="grid gap-2">
                        <Label htmlFor="workflow-action">Action</Label>
                        <Select value={selectedWorkflowId} onValueChange={setSelectedWorkflowId} disabled={workflows.length === 0}>
                            <SelectTrigger id="workflow-action" className="w-full">
                                <SelectValue placeholder="Select an action" />
                            </SelectTrigger>
                            <SelectContent>
                                {workflows.map((workflow) => (
                                    <SelectItem key={getWorkflowKey(workflow)} value={getWorkflowKey(workflow)}>
                                        {workflowLabel(workflow)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {typeof (selectedWorkflow as (Workflow & { additional_info?: unknown }) | null)?.additional_info === 'string' &&
                            (selectedWorkflow as (Workflow & { additional_info?: string }) | null)?.additional_info?.trim() !== '' && (
                                <p className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
                                    {(selectedWorkflow as Workflow & { additional_info: string }).additional_info}
                                </p>
                            )}
                        {workflows.length === 0 && (
                            <p className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
                                No workflow actions are currently available for this item.
                            </p>
                        )}
                    </div>

                    {selectedWorkflow &&
                        userParameters.map((parameter) => (
                            <div key={parameter.name} className="grid gap-2">
                                <Label htmlFor={parameter.name}>
                                    {parameter.label ?? parameter.name}
                                    {parameter.required && <span className="text-destructive"> *</span>}
                                </Label>
                                {renderField(parameter)}
                                {parameter.help && <p className="text-sm text-muted-foreground">{parameter.help}</p>}
                            </div>
                        ))}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={!selectedWorkflow || !isValid || submitting}>
                        {submitting ? 'Submitting...' : 'Submit'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default WorkflowDialogTrigger;
