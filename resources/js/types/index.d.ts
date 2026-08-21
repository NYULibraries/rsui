import { LucideIcon } from 'lucide-react';
import type { Config } from 'ziggy-js';

// ---------------------------------------------------------------------------
// App/Inertia view models — internal to RSUI, safe to change freely.
// ---------------------------------------------------------------------------

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface FlashMessages {
    success?: string | null;
    error?: string | null;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    flash: FlashMessages;
    ziggy: Config & { location: string };
    sidebarOpen: boolean;
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// External API payload models — these mirror shapes returned by the RS API
// (via ExternalApiService/Inertia props) and are NOT freely changeable. Any
// field renamed/removed here must match a corresponding upstream contract
// change; see docs/api-contract.md for the source-of-truth field list.
// ---------------------------------------------------------------------------

export interface Partner {
    id: number;
    code: string;
    name: string;
    created_at: string;
    updated_at: string;
    partners_url: string;
    colls_url: string;
    lock_version: number;
    path: string;
    collections: Collection[];
}

export interface Collection {
    id: string;
    partner_id: string;
    owner_id: string;
    code: string;
    display_code: string;
    path: string;
    name: string;
    coll_type: string;
    classification: string;
    created_at: string;
    updated_at: string;
    quota: number;
    ready_for_content: boolean;
    partner_url: string;
    owner_url: string;
    ses_url: string;
    ies_url: string;
    lock_version: number;
    rel_path: string;
    partner: Partner;
    storage_url: string;
}

// ---------------------------------------------------------------------------
// App/Inertia view models — internal to RSUI, safe to change freely.
// ---------------------------------------------------------------------------

export interface ViewerImage {
    alt: string;
    title: string;
    src: string;
}

export interface RBSE {
    expires: number;
}

export interface CollectionTableProps {
    collections: Collection[];
}

export interface PartnersTableProps {
    partners: Partner[];
}

// ---------------------------------------------------------------------------
// External API payload models — mirror the RS API workflow/file-item contract.
// See docs/api-contract.md and resources/js/lib/workflows.ts for semantics.
// ---------------------------------------------------------------------------

export interface WorkflowParameterOption {
    value: string;
    description?: string;
}

export interface WorkflowParameter {
    name: string;
    provided_by: 'context' | 'user';
    binding?: string;
    label?: string;
    type?: string;
    required?: boolean;
    options?: Array<string | WorkflowParameterOption>;
    pattern?: string;
    help?: string;
}

export interface Workflow {
    workflow_id: string;
    version: string;
    description: string;
    applies_to: {
        object_types: Array<'file' | 'directory'>;
        mime_types?: string[]; // Restricts which files a workflow accepts. Omitted/empty means unrestricted.
    };
    parameters: WorkflowParameter[];
}

export interface AvailableWorkflows {
    directory?: Workflow[];
    file?: Workflow[];
}

export interface FileItem {
    name: string;
    extension: string;
    object_type: 'file' | 'directory';
    display_size: string;
    size: number;
    last_modified: string;
    url: string;
    download_url?: string;
    preview_url?: string;
    children?: FileItem[];
    path?: string;
    mime_type?: string;
    preview?: boolean;
    is_directory?: boolean;
    is_file?: boolean;
    is_empty_dir?: boolean;
    available_workflows?: AvailableWorkflows;
}

// ---------------------------------------------------------------------------
// App/Inertia view models — internal to RSUI, safe to change freely.
// ---------------------------------------------------------------------------

export interface FileExplorerProps {
    storage: Storage;
}

export interface FileExplorerState {
    currentData: FileItem[] | null;
    selected: string | null;
    filter: string;
    loading: boolean;
}

export interface Storage {
    display_size: string;
    name: string;
    object_type: string;
    url: string;
    children?: FileItem[];
}

export interface FilePreviewDialogTriggerProps {
    item: FileItem;
    triggerLabel?: string; // The text for the button/link that opens the dialog. Omit to render a controlled, trigger-less dialog.
    open?: boolean; // Controls the dialog externally (e.g. from a Select-driven actions menu)
    onOpenChange?: (open: boolean) => void;
    preloadedContent?: { content: string; fileType: string } | null;
}

export interface WorkflowDialogTriggerProps {
    item: FileItem;
    workflow?: Workflow;
    workflows?: Workflow[];
    pathSegments?: string[]; // Ancestor breadcrumb names, mirroring the explorer path, used to title the dialog.
    partnerName?: string; // Owning partner, shown above the path in the dialog title.
    collectionName?: string; // Owning collection, shown above the path in the dialog title.
    triggerLabel?: string; // The text for the button/link that opens the dialog. Omit to render a controlled, trigger-less dialog.
    open?: boolean; // Controls the dialog externally (e.g. from a Select-driven actions menu)
    onOpenChange?: (open: boolean) => void;
}

export interface FilePreviewerProps {
    item?: FileItem;
    preloadedContent?: { content: string; fileType: string } | null;
}

// ---------------------------------------------------------------------------
// External API payload models — mirror the RS search response shape.
// ---------------------------------------------------------------------------

interface SearchResult {
    package_id: string;
    package_name: string;
    coll_code: string;
    coll_id: string;
    coll_display_code: string;
    coll_rel_path: string;
    coll_path: string;
    package_type: string;
    package_state: string;
    partner_code: string;
    partner_name: string;
    package_path_url: string;
    match_context?: string;
    match_path_url: string;
}

// ---------------------------------------------------------------------------
// App/Inertia view models — internal to RSUI, safe to change freely.
// ---------------------------------------------------------------------------

interface SearchPageProps {
    term: string;
    results: SearchResult[];
    numFound: number;
    start: number;
    error?: string;
    page?: number;
    totalPages?: number;
    [key: string]: unknown;
}
