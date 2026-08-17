import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import React, { useState } from 'react';
import { toast } from 'sonner';

import type { WorkflowDialogTriggerProps, WorkflowParameter, WorkflowParameterOption } from '@/types';

/**
 * Renders a trigger (link/button) that opens a dialog for a workflow (e.g. "push_rw_flow"),
 * letting the user fill in the user-provided parameters before submitting.
 */
const WorkflowDialogTrigger: React.FC<WorkflowDialogTriggerProps> = ({ item, workflow, triggerLabel, open: openProp, onOpenChange }) => {
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
    const [values, setValues] = useState<Record<string, string>>({});

    const userParameters = workflow.parameters.filter((parameter) => parameter.provided_by === 'user');

    const setValue = (name: string, value: string) => {
        setValues((prev) => ({ ...prev, [name]: value }));
    };

    const isValid = userParameters.every((parameter) => {
        if (!parameter.required) {
            return true;
        }

        const value = values[parameter.name];

        return typeof value === 'string' && value.trim().length > 0;
    });

    const handleSubmit = async () => {
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

            const response = await fetch('/api/workflows/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': xsrfToken,
                },
                body: JSON.stringify({
                    workflow_id: workflow.workflow_id,
                    parameters: {
                        source_path: item.url,
                        ...Object.fromEntries(userParameters.map((param) => [param.name, values[param.name] ?? ''])),
                    },
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error('Workflow submission failed.', {
                    description: data?.message ?? `Server responded with status ${response.status}.`,
                });
            } else {
                const jobId = data?.data?.job_id;
                toast.success('Workflow submitted successfully.', {
                    description: jobId
                        ? `Workflow "${workflow.workflow_id}" has been queued as job ${jobId}.`
                        : (data?.message ?? `Workflow "${workflow.workflow_id}" has been queued.`),
                });
                setOpen(false);
            }
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            toast.error('Workflow submission failed.', { description: message });
        } finally {
            setSubmitting(false);
        }
    };

    const renderField = (parameter: WorkflowParameter) => {
        const value = values[parameter.name] ?? '';

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
            <Input
                id={parameter.name}
                value={value}
                pattern={parameter.pattern}
                required={parameter.required}
                onChange={(e) => setValue(parameter.name, e.target.value)}
            />
        );
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {triggerLabel && (
                <DialogTrigger asChild>
                    <Button variant="link" className="h-auto cursor-pointer p-0 text-primary hover:underline" onClick={() => setOpen(true)}>
                        {triggerLabel}
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="flex h-[80vh] w-[80vw] max-w-[80vw] flex-col overflow-y-auto sm:max-w-[80vw]">
                <DialogHeader>
                    <DialogTitle>Push to Research Workspace</DialogTitle>
                    <DialogDescription>
                        Send <span className="font-mono text-sm break-all">{item.name}</span> to a Research Workspace share.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-1 flex-col gap-6 overflow-y-auto py-2">
                    <div className="grid gap-2">
                        <Label>Workflow description</Label>
                        <p className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">{workflow.description}</p>
                    </div>

                    {userParameters.map((parameter) => (
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
                    <Button onClick={handleSubmit} disabled={!isValid || submitting}>
                        {submitting ? 'Submitting...' : 'Submit'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default WorkflowDialogTrigger;
