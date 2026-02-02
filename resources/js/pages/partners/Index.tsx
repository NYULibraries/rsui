import { PartnersTable } from '@/components/PartnersTable';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Partner } from '@/types';
import { Head, usePage } from '@inertiajs/react';

export default function Dashboard() {
    const { partners } = usePage<{
        partners: Partner[];
    }>().props;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Partners',
            href: '/dashboard',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Partners" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <PartnersTable partners={partners} />
            </div>
        </AppLayout>
    );
}
