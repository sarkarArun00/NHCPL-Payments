import axios, {
    AxiosError,
    InternalAxiosRequestConfig,
} from 'axios';

import { API_CONFIG } from './apiConfig';
import { useAuthStore } from '../store/authStore';

export const apiClient = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: API_CONFIG.TIMEOUT,
    headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
    },
});

apiClient.interceptors.request.use(
    async (
        config: InternalAxiosRequestConfig,
    ) => {
        const isAuthPublicRequest =
            config.url?.includes(
                'auth/employeeLogin',
            ) ||
            config.url?.includes(
                'auth/client/forgot-password',
            ) ||
            config.url?.includes(
                'auth/client/verify-otp',
            ) ||
            config.url?.includes(
                'auth/client/reset-password',
            );

        const session =
            useAuthStore.getState().session;

        if (!isAuthPublicRequest) {
            const token =
                session?.accessToken;

            const userId = Number(
                session?.employee?.id ?? 0,
            );

            if (token) {
                config.headers.Authorization =
                    `Bearer ${token}`;
            }

            if (userId > 0) {
                config.headers.set(
                    'User_id',
                    String(userId),
                );
            }
        }

        /*
         * React Native FormData contains
         * an internal _parts array.
         */
        const isFormDataRequest =
            typeof FormData !== 'undefined' &&
            (
                config.data instanceof FormData ||
                Array.isArray(
                    (config.data as any)?._parts,
                )
            );

        if (isFormDataRequest) {
            /*
             * Remove application/json or a manually
             * assigned multipart header.
             *
             * Axios/React Native must generate the
             * multipart boundary automatically.
             */
            const headers =
                config.headers as any;

            if (
                typeof headers?.delete ===
                'function'
            ) {
                headers.delete(
                    'Content-Type',
                );

                headers.delete(
                    'content-type',
                );
            } else {
                delete headers[
                    'Content-Type'
                ];

                delete headers[
                    'content-type'
                ];
            }
        }

        let sanitizedData: any;

        if (isFormDataRequest) {
            const parts = Array.isArray(
                (config.data as any)?._parts,
            )
                ? (config.data as any)._parts
                : [];

            sanitizedData = parts.map(
                ([key, value]: [
                    string,
                    any,
                ]) => {
                    if (
                        value &&
                        typeof value === 'object' &&
                        value.uri
                    ) {
                        return [
                            key,
                            {
                                name:
                                    value.name ||
                                    'attachment',
                                type:
                                    value.type ||
                                    'application/octet-stream',
                                uri: '[FILE URI]',
                            },
                        ];
                    }

                    return [
                        key,
                        key === 'user_pass'
                            ? '******'
                            : value,
                    ];
                },
            );
        } else if (
            config.data &&
            typeof config.data === 'object'
        ) {
            sanitizedData = {
                ...config.data,

                ...(config.data.user_pass
                    ? {
                        user_pass:
                            '******',
                    }
                    : {}),
            };
        } else {
            sanitizedData =
                config.data;
        }

        console.log(
            '========== API REQUEST ==========',
        );

        console.log(
            'METHOD:',
            config.method?.toUpperCase(),
        );

        console.log(
            'URL:',
            `${config.baseURL ?? ''}${config.url ?? ''
            }`,
        );

        console.log(
            'IS FORM DATA:',
            isFormDataRequest,
        );

        console.log(
            'PARAMS:',
            config.params ?? {},
        );

        console.log(
            'PAYLOAD:',
            sanitizedData ?? {},
        );

        console.log(
            '=================================',
        );

        return config;
    },
    error =>
        Promise.reject(error),
);

apiClient.interceptors.response.use(
    response => {
        console.log('========== API RESPONSE =========');
        console.log('URL:', response.config.url);
        console.log('STATUS:', response.status);
        console.log('RESPONSE:', response.data);
        console.log('=================================');

        return response;
    },
    (error: AxiosError<any>) => {
        console.log('========== API ERROR ============');
        console.log('URL:', error.config?.url);
        console.log('STATUS:', error.response?.status);
        console.log('RESPONSE:', error.response?.data);
        console.log('MESSAGE:', error.message);
        console.log('=================================');

        return Promise.reject(error);
    },
);