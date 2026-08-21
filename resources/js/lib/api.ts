export class ApiError extends Error {
    constructor(
        message: string,
        public readonly status: number,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

const responseBody = async (response: Response): Promise<string> => {
    const body = (await response.text()).trim();

    if (body === '') {
        throw new ApiError('The server returned an empty response.', response.status);
    }

    return body;
};

export async function apiFetch<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
    const response = await fetch(input, {
        credentials: 'same-origin',
        ...init,
    });
    const body = await responseBody(response);

    if (!response.ok) {
        throw new ApiError(`Server responded with status ${response.status}.`, response.status);
    }

    try {
        return JSON.parse(body) as T;
    } catch {
        if (body.startsWith('<')) {
            throw new ApiError('The server returned a page instead of data. Your session may have expired — try reloading.', response.status);
        }

        throw new ApiError('The server returned a response that could not be read.', response.status);
    }
}

export async function apiFetchText(input: RequestInfo | URL, init?: RequestInit): Promise<string> {
    const response = await fetch(input, {
        credentials: 'same-origin',
        ...init,
    });
    const body = await responseBody(response);

    if (!response.ok) {
        throw new ApiError(`Server responded with status ${response.status}.`, response.status);
    }

    return body;
}
