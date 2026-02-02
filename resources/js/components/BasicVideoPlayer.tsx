import React, { useMemo } from 'react';
import { toast } from 'sonner';

// http://localhost:8000/paths/2f096796-c685-444f-a4fe-5971346b159d/58d5e21d-e9c7-4312-999a-fed15d4780a2/xip/fales_mss437_cuid41513_4430EA4F-23EB-4AA6-B62D-C33C94DE809A/data/fales_mss437_cuid41513

const BasicVideoPlayer: React.FC<{ src: string; type: string }> = ({ src, type }) => {
    // Sanitize source to ensure it's a valid URL for the video element
    const mediaSrc = useMemo(() => {
        try {
            return src;
        } catch (e) {
            console.error('Invalid video source URL:', src, e);
            toast.error('Invalid video source URL.', { description: 'The video file link is malformed.' });
            return ''; // Return empty string if invalid
        }
    }, [src]);

    if (!mediaSrc) {
        return (
            <div className="flex flex-col items-center justify-center rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
                <p>Cannot play video: Invalid source URL.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center p-4">
            <video controls className="w-full max-w-md">
                <source src={mediaSrc} type={type} />
                Your browser does not support the video element.
            </video>
            <p className="mt-2 text-sm text-gray-600">
                File Type: {type || 'Unknown'}
                {src.startsWith('blob:') && ' (Streaming)'}
            </p>
        </div>
    );
};

export default BasicVideoPlayer;
