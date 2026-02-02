import { useCallback, useEffect, useState } from 'react';

export type Appearance = 'light' | 'dark' | 'system';

export interface AppearanceSettings {
    theme: Appearance;
    collectionDetailsCollapsed: boolean;
}

const prefersDark = () => {
    if (typeof window === 'undefined') {
        return false;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const setCookie = (name: string, value: string, days = 365) => {
    if (typeof document === 'undefined') {
        return;
    }

    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
};

const applyTheme = (appearance: Appearance) => {
    const isDark = appearance === 'dark' || (appearance === 'system' && prefersDark());

    document.documentElement.classList.toggle('dark', isDark);
};

const mediaQuery = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    return window.matchMedia('(prefers-color-scheme: dark)');
};

const getAppearanceSettings = (): AppearanceSettings => {
    if (typeof window === 'undefined') {
        return { theme: 'system', collectionDetailsCollapsed: true };
    }
    const savedSettings = localStorage.getItem('appearance_settings');
    if (savedSettings) {
        try {
            const parsed = JSON.parse(savedSettings);
            return {
                theme: parsed.theme || 'system',
                collectionDetailsCollapsed: typeof parsed.collectionDetailsCollapsed === 'boolean' ? parsed.collectionDetailsCollapsed : true,
            };
        } catch (e) {
            console.error('Failed to parse appearance settings from localStorage', e);
            return { theme: 'system', collectionDetailsCollapsed: true };
        }
    }
    return { theme: 'system', collectionDetailsCollapsed: true };
};

const handleSystemThemeChange = () => {
    const settings = getAppearanceSettings();
    applyTheme(settings.theme || 'system');
};

export function initializeTheme() {
    const settings = getAppearanceSettings();
    applyTheme(settings.theme);
    mediaQuery()?.addEventListener('change', handleSystemThemeChange);
}

export function useAppearance() {
    const [settings, setSettings] = useState<AppearanceSettings>({ theme: 'system', collectionDetailsCollapsed: true });

    const updateAppearance = useCallback((theme: Appearance) => {
        setSettings((prev) => {
            const newSettings = { ...prev, theme };
            localStorage.setItem('appearance_settings', JSON.stringify(newSettings));
            setCookie('appearance', theme); // for SSR
            applyTheme(theme);
            return newSettings;
        });
    }, []);

    const updateCollectionDetailsCollapsed = useCallback((collapsed: boolean) => {
        setSettings((prev) => {
            const newSettings = { ...prev, collectionDetailsCollapsed: collapsed };
            localStorage.setItem('appearance_settings', JSON.stringify(newSettings));
            return newSettings;
        });
    }, []);

    useEffect(() => {
        const savedSettings = getAppearanceSettings();
        setSettings(savedSettings);
        applyTheme(savedSettings.theme);

        return () => mediaQuery()?.removeEventListener('change', handleSystemThemeChange);
    }, []);

    return {
        appearance: settings.theme,
        collectionDetailsCollapsed: settings.collectionDetailsCollapsed,
        updateAppearance,
        updateCollectionDetailsCollapsed,
    } as const;
}
