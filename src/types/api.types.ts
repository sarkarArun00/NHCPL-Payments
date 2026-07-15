export type ApiResponse<T> = {
    status: number | boolean;
    success?: boolean;
    message?: string;
    data: T;
};

export type ApiErrorResponse = {
    status?: number | boolean;
    success?: boolean;
    message?: string;
    error?: string;
};