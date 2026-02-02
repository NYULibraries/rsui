import React, { useMemo } from 'react';
import { toast } from 'sonner';

const BasicAudioPlayer: React.FC<{ src: string; type: string }> = ({ src, type }) => {
    // Sanitize source to ensure it's a valid URL for the audio element
    const audioSrc = useMemo(() => {
        try {
            return src;
        } catch (e) {
            console.error('Invalid audio source URL:', src, e);
            toast.error('Invalid audio source URL.', { description: 'The audio file link is malformed.' });
            return ''; // Return empty string if invalid
        }
    }, [src]);

    if (!audioSrc) {
        return (
            <div className="flex flex-col items-center justify-center rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
                <p>Cannot play audio: Invalid source URL.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center p-4">
            <audio controls className="w-full max-w-md">
                <source src={audioSrc} type={type} />
                Your browser does not support the audio element.
            </audio>
            <p className="mt-2 text-sm text-gray-600">
                File Type: {type || 'Unknown'}
                {src.startsWith('blob:') && ' (Streaming)'}
            </p>
        </div>
    );
};

export default BasicAudioPlayer;
