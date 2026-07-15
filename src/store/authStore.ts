import { appStorage } from '../storage/appStorage';
import { create } from 'zustand';

import { authApi } from '../api/auth.api';
import {
    AuthSession,
    LoginPayload,
} from '../types/auth.types';

const AUTH_SESSION_KEY = 'ACCOUNTS_AUTH_SESSION';

type AuthState = {
    session: AuthSession | null;
    isAuthenticated: boolean;
    isInitializing: boolean;
    isLoggingIn: boolean;
    loginError: string | null;

    restoreSession: () => Promise<void>;
    login: (payload: LoginPayload) => Promise<boolean>;
    logout: () => Promise<void>;
    clearLoginError: () => void;
};

export const useAuthStore = create<AuthState>(set => ({
    session: null,
    isAuthenticated: false,
    isInitializing: true,
    isLoggingIn: false,
    loginError: null,

    restoreSession: async () => {
        try {
            const storedSession = await appStorage.getItem(
                AUTH_SESSION_KEY,
            );

            if (!storedSession) {
                set({
                    session: null,
                    isAuthenticated: false,
                    isInitializing: false,
                });

                return;
            }

            const session = JSON.parse(
                storedSession,
            ) as AuthSession;

            if (
                !session?.accessToken ||
                !session?.employee?.id ||
                !session?.centreId
            ) {
                await appStorage.removeItem(AUTH_SESSION_KEY);

                set({
                    session: null,
                    isAuthenticated: false,
                    isInitializing: false,
                });

                return;
            }

            set({
                session,
                isAuthenticated: true,
                isInitializing: false,
            });
        } catch (error) {
            console.error(
                'Session restoration failed:',
                error,
            );

            set({
                session: null,
                isAuthenticated: false,
                isInitializing: false,
            });
        }
    },

    login: async payload => {
        set({
            isLoggingIn: true,
            loginError: null,
        });

        try {
            const response = await authApi.login(payload);

            const isSuccessful =
                response?.status === 1 &&
                response?.success === true &&
                Boolean(response?.access_token) &&
                Boolean(response?.employee);

            if (!isSuccessful) {
                set({
                    isLoggingIn: false,
                    loginError:
                        response?.message || 'Unable to log in',
                });

                return false;
            }

            const safeEmployee = {
                id: response.employee.id,
                employee_code: response.employee.employee_code,
                employee_name: response.employee.employee_name,
                phoneNumber: response.employee.phoneNumber,
                email_id: response.employee.email_id,
                user_type: response.employee.user_type,
                userTypeName: response.employee.userTypeName,
                user_name: response.employee.user_name,
                employeePhoto: response.employee.employeePhoto,
                signature: response.employee.signature,
                gender: response.employee.gender,
                dateOfBirth: response.employee.dateOfBirth,
                dateOfJoining: response.employee.dateOfJoining,
                address: response.employee.address,
                status: response.employee.status,
                global: response.employee.global,
            };

            const session: AuthSession = {
                accessToken: response.access_token,
                centreId: response.centreId,
                employee: safeEmployee,
            };

            // Update Zustand first so AppNavigator redirects immediately
            set({
                session,
                isAuthenticated: true,
                isLoggingIn: false,
                loginError: null,
            });

            console.log(
                'AUTH STATE AFTER LOGIN:',
                useAuthStore.getState(),
            );

            // Save session separately
            try {
                await appStorage.setItem(
                    AUTH_SESSION_KEY,
                    JSON.stringify(session),
                );
            } catch (storageError) {
                console.error(
                    'Unable to save login session:',
                    storageError,
                );
            }

            return true;
        } catch (error: any) {
            const message =
                error?.response?.data?.message ||
                error?.message ||
                'Unable to connect to the server';

            set({
                isLoggingIn: false,
                isAuthenticated: false,
                loginError: message,
            });

            return false;
        }
    },

    logout: async () => {
        try {
            await appStorage.removeItem(AUTH_SESSION_KEY);
        } finally {
            set({
                session: null,
                isAuthenticated: false,
                loginError: null,
            });
        }
    },

    clearLoginError: () => {
        set({
            loginError: null,
        });
    },
    
}));

