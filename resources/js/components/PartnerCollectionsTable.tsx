'use client';

import { Button } from '@/components/ui/button';
import { Link } from '@inertiajs/react';
import { ArrowUpDown, ChevronRight } from 'lucide-react';
import * as React from 'react';

import type { ColumnDef, ColumnFiltersState } from '@tanstack/react-table';

import type { Collection, CollectionTableProps } from '@/types';

import { flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function DebouncedInput({
    value: initialValue,
    onChange,
    debounce = 500,
    ...props
}: {
    value: string | number;
    onChange: (value: string | number) => void;
    debounce?: number;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
    const [value, setValue] = React.useState(initialValue);

    React.useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    React.useEffect(() => {
        const timeout = setTimeout(() => {
            onChange(value);
        }, debounce);

        return () => clearTimeout(timeout);
    }, [value, onChange, debounce]);

    return <input {...props} value={value} onChange={(e) => setValue(e.target.value)} />;
}

export function PartnerCollectionsTable({ collections }: CollectionTableProps) {
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

    const [globalFilter, setGlobalFilter] = React.useState('');

    const columns = React.useMemo<ColumnDef<Collection>[]>(
        () => [
            {
                accessorKey: 'name',
                header: ({ column }) => {
                    return (
                        <div className="flex flex-col items-start">
                            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                                Collection name
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    );
                },
                cell: ({ row }) => {
                    return (
                        <div className="max-w-xs text-left font-medium">
                            <Link href={route('collection.show', row.getValue('id'))} className="flex items-center px-4 focus:outline-none">
                                <span className="line-clamp-2">{row.getValue('name')}</span>
                            </Link>
                        </div>
                    );
                },
                enableSorting: true,
                filterFn: 'includesStringSensitive',
            },
            {
                accessorKey: 'display_code',
                header: ({ column }) => {
                    return (
                        <div className="flex flex-col items-start">
                            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                                Code
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    );
                },
                cell: ({ row }) => {
                    return (
                        <div className="w-24 text-left font-medium">
                            <Link href={route('collection.show', row.getValue('id'))} className="flex items-center px-4 focus:outline-none">
                                {row.getValue('display_code')}
                            </Link>
                        </div>
                    );
                },
                enableSorting: true,
                filterFn: 'includesStringSensitive',
            },
            {
                accessorKey: 'path',
                header: () => (
                    <div className="flex flex-col items-start">
                        <div className="px-4 py-2 text-left">R* Path</div>
                    </div>
                ),
                cell: ({ row }) => {
                    return (
                        <div className="text-left font-medium">
                            <Link href={route('collection.show', row.getValue('id'))} className="flex items-center px-4 focus:outline-none">
                                <span className="line-clamp-2">{row.getValue('path')}</span>
                            </Link>
                        </div>
                    );
                },
            },
            {
                accessorKey: 'id',
                header: () => <></>,
                cell: ({ row }) => {
                    return (
                        <Link href={route('collection.show', row.getValue('id'))} className="flex items-center px-2 focus:outline-none">
                            <ChevronRight size={24} className="text-gray-400" />
                        </Link>
                    );
                },
            },
        ],
        [],
    );

    // Initialize data state with partners and update if partners prop changes
    const [data, setData] = React.useState<Collection[]>(collections);

    React.useEffect(() => {
        setData(collections);
    }, [collections]);

    const table = useReactTable({
        data,
        columns,
        state: {
            columnFilters,
            globalFilter,
        },
        initialState: {
            columnOrder: ['name', 'code'],
            sorting: [
                {
                    id: 'code',
                    desc: false,
                },
            ],
        },
        onColumnFiltersChange: setColumnFilters,
        onGlobalFilterChange: setGlobalFilter,
        globalFilterFn: 'includesString',
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <div>
            <div className="flex items-center py-4">
                <DebouncedInput
                    value={globalFilter ?? ''}
                    onChange={(value) => setGlobalFilter(String(value))}
                    className="flex h-9 w-full max-w-sm rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    placeholder="Filter by collection name or code..."
                />
            </div>
            <div className="rounded-md border">
                <Table>
                    <colgroup>
                        <col className="w-2/5" />
                        <col className="w-1/6" />
                        <col className="w-2/5" />
                        <col className="w-auto" />
                    </colgroup>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
