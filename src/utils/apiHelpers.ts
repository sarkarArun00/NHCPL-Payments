export const isSuccessfulResponse = (
    status: number | boolean | string | undefined,
): boolean => {
    return status === 1 || status === true || status === '1';
};