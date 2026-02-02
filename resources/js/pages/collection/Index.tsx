import FileExplorer from '@/components/FileExplorer';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppearance } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import type { Collection, FileItem } from '@/types';
import { type BreadcrumbItem } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Partner() {
    const { collection, storage_path } = usePage<{
        collection: Collection;
        storage_path: FileItem[];
    }>().props;

    const { partner } = collection;

    const { collectionDetailsCollapsed } = useAppearance();
    const [isTableVisible, setIsTableVisible] = useState(!collectionDetailsCollapsed);

    useEffect(() => {
        setIsTableVisible(!collectionDetailsCollapsed);
    }, [collectionDetailsCollapsed]);

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Partners',
            href: '/dashboard',
        },
        {
            title: partner.name,
            href: `/partners/${partner.id}`,
        },
        {
            title: collection.name,
            href: `/collections/${collection.id}`,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${collection.name} - ${partner.name}`} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">{collection.name}</h4>
                <div className="rounded-md border">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={() => setIsTableVisible(!isTableVisible)}
                                    variant="ghost"
                                    className="flex w-full cursor-pointer items-center justify-between px-4 py-2"
                                >
                                    <h5 className="text-l scroll-m-20 font-semibold tracking-tight">Collection Details</h5>
                                    {isTableVisible ? <ChevronUp /> : <ChevronDown />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Click to {isTableVisible ? 'collapse' : 'expand'} collection details</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    {isTableVisible && (
                        <Table id="collection-details-table" className="w-full">
                            <TableBody>
                                <TableRow>
                                    <TableCell className="font-medium">Partner Name</TableCell>
                                    <TableCell>{partner.name}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">Partner Code</TableCell>
                                    <TableCell>{partner.code}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">Partner R* Path</TableCell>
                                    <TableCell>{partner.path}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">Collection Long Name</TableCell>
                                    <TableCell>{collection.name}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">Collection Code</TableCell>
                                    <TableCell>{collection.display_code}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">Collection R* Code</TableCell>
                                    <TableCell>{collection.code}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">R* Path</TableCell>
                                    <TableCell>{collection.path}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">Ready for Content?</TableCell>
                                    <TableCell>{collection.ready_for_content ? 'Yes' : 'No'}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">Quota (GB)</TableCell>
                                    <TableCell>{collection.quota.toLocaleString()}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    )}
                </div>
                <h5 className="text-l scroll-m-20 font-semibold tracking-tight">Perspectives</h5>
                <div className="rounded-md border">
                    <FileExplorer storage={storage_path} partnerId={String(partner.id)} collectionId={String(collection.id)} />
                </div>
            </div>
        </AppLayout>
    );
}
