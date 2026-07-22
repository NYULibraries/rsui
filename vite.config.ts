import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import inertia from '@inertiajs/vite';
import { resolve } from 'node:path';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
        }),
        react(),
        tailwindcss(),
        inertia(),
    ],
    resolve: {
        alias: {
            'ziggy-js': resolve(__dirname, 'vendor/tightenco/ziggy'),
        },
    },
    // DDEV Network Proxy Pass Layer
    server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,

        // Tells Laravel to load assets from DDEV's host machine edge port
        origin: process.env.DDEV_HOSTNAME ? `https://${process.env.DDEV_HOSTNAME}:5173` : undefined,

        // Whitelists CORS requests from your custom DDEV dev domain
        cors: {
            origin: /https?:\/\/([A-Za-z0-9\\-\\.]+)?(\.ddev\.site)(?::\d+)?$/,
        },

        // Handles live websocket script reloading inside docker container
        hmr: {
            host: process.env.DDEV_HOSTNAME,
            protocol: 'wss',
        },
    },
});
