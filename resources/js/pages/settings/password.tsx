import { ErrorModal } from '@/components/error-modal';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { SuccessModal } from '@/components/success-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Password settings',
        href: '/settings/password',
    },
];

type PasswordForm = {
    current_password: string;
    password: string;
    password_confirmation: string;
};

export default function Password() {
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);

    const { data, setData, patch, errors, processing } = useForm<PasswordForm>({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const [passwordMismatchError, setPasswordMismatchError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);

    useEffect(() => {
        if (successMessage) {
            setShowSuccessModal(true);
            const timer = setTimeout(() => setShowSuccessModal(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    useEffect(() => {
        if (errorMessage) {
            setShowErrorModal(true);
            const timer = setTimeout(() => setShowErrorModal(false), 4000);
            return () => clearTimeout(timer);
        }
    }, [errorMessage]);

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setData('password', e.target.value);
        if (e.target.value !== data.password_confirmation && data.password_confirmation !== '') {
            setPasswordMismatchError('The password confirmation does not match.');
        } else {
            setPasswordMismatchError(null);
        }
    };

    const handlePasswordConfirmationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setData('password_confirmation', e.target.value);
        if (e.target.value !== data.password && data.password !== '') {
            setPasswordMismatchError('The password confirmation does not match.');
        } else {
            setPasswordMismatchError(null);
        }
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (data.password !== data.password_confirmation) {
            setPasswordMismatchError('The password confirmation does not match.');
            return;
        }

        patch(route('password.update'), {
            preserveScroll: true,
            onSuccess: (page) => {
                setSuccessMessage(null);
                // Access flash message safely from page.props.flash?.success
                if (page?.props?.flash?.success) {
                    setSuccessMessage(page.props.flash.success);
                    setShowSuccessModal(true);
                }
                setData('current_password', '');
                setData('password', '');
                setData('password_confirmation', '');
            },
            onError: () => {
                setSuccessMessage(null);
                setErrorMessage('There was an error updating the password.');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Password settings" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title="Password" description="Update your password" />

                    <form onSubmit={submit} className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="current_password">Current password</Label>
                            <div className="relative">
                                <Input
                                    id="current_password"
                                    type={showCurrentPassword ? 'text' : 'password'}
                                    className="mt-1 block w-full"
                                    value={data.current_password}
                                    onChange={(e) => setData('current_password', e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    placeholder="Current password"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                >
                                    {showCurrentPassword ? 'Hide' : 'Show'}
                                </Button>
                            </div>
                            <InputError className="mt-2" message={errors.current_password} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password">New password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="mt-1 block w-full"
                                    value={data.password}
                                    onChange={handlePasswordChange}
                                    required
                                    autoComplete="new-password"
                                    placeholder="New password"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? 'Hide' : 'Show'}
                                </Button>
                            </div>
                            <InputError className="mt-2" message={errors.password} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password_confirmation">Confirm new password</Label>
                            <div className="relative">
                                <Input
                                    id="password_confirmation"
                                    type={showPasswordConfirmation ? 'text' : 'password'}
                                    className="mt-1 block w-full"
                                    value={data.password_confirmation}
                                    onChange={handlePasswordConfirmationChange}
                                    required
                                    autoComplete="new-password"
                                    placeholder="Confirm new password"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
                                >
                                    {showPasswordConfirmation ? 'Hide' : 'Show'}
                                </Button>
                            </div>
                            <InputError className="mt-2" message={errors.password_confirmation || passwordMismatchError} />
                        </div>

                        <div className="flex items-center gap-4">
                            <Button disabled={processing}>Save</Button>
                        </div>
                    </form>
                </div>
            </SettingsLayout>

            <SuccessModal open={showSuccessModal} onClose={() => setShowSuccessModal(false)} message={successMessage || ''} />
            <ErrorModal open={showErrorModal} onClose={() => setShowErrorModal(false)} message={errorMessage || ''} />
        </AppLayout>
    );
}
