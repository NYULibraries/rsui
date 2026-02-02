import { PartnerCollectionsTable } from '@/components/PartnerCollectionsTable';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Partner } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { Separator } from '@radix-ui/react-separator';

export default function Partner() {
    const { partner } = usePage<{
        partner: Partner;
    }>().props;

    const { collections } = partner;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Partners',
            href: '/dashboard',
        },
        {
            title: partner.name,
            href: `/partners/${partner.id}`,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={partner.name} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">{partner.name}</h4>
                <div className="rounded-md border">
                    <Table>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-medium">Code</TableCell>
                                <TableCell>{partner.code}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">R* Path</TableCell>
                                <TableCell>{partner.path}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
                <Separator />
                <h5 className="text-l scroll-m-20 font-semibold tracking-tight">Partner collections</h5>
                <PartnerCollectionsTable collections={collections} />
            </div>
        </AppLayout>
    );
}
