import { Button } from '@/components/ui/button';
import { Dialog, Transition } from '@headlessui/react';
import { CheckCircle } from 'lucide-react';
import { Fragment, useEffect } from 'react';

export function SuccessModal({
    open,
    onClose,
    message,
    autoClose = true,
    duration = 3000,
}: {
    open: boolean;
    onClose: () => void;
    message: string;
    autoClose?: boolean;
    duration?: number;
}) {
    useEffect(() => {
        if (open && autoClose) {
            const timeout = setTimeout(onClose, duration);
            return () => clearTimeout(timeout);
        }
    }, [open, autoClose, duration, onClose]);

    return (
        <Transition appear show={open} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                    >
                        <Dialog.Panel className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                            <CheckCircle className="mx-auto mb-2 h-10 w-10 text-green-500" />
                            <Dialog.Title className="text-lg font-semibold text-gray-800 dark:text-gray-100">Success</Dialog.Title>
                            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">{message}</div>
                            <div className="mt-4">
                                <Button variant="outline" onClick={onClose}>
                                    Close
                                </Button>
                            </div>
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition>
    );
}
