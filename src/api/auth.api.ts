import { apiClient } from './apiClient';
import {
    BasicAuthResponse,
    ForgotPasswordRequestPayload,
    LoginPayload,
    LoginResponse,
    ResetPasswordPayload,
    VerifyOtpPayload,
} from '../types/auth.types';

export const authApi = {
    login: async (
        payload: LoginPayload,
    ): Promise<LoginResponse> => {
        const response =
            await apiClient.post<LoginResponse>(
                'auth/employeeLogin',
                payload,
            );

        return response.data;
    },

    requestClientOtp: async (
        payload: ForgotPasswordRequestPayload,
    ): Promise<BasicAuthResponse> => {
        const response =
            await apiClient.post<BasicAuthResponse>(
                'requestOTP',
                payload,
            );

        return response.data;
    },

    verifyClientOtp: async (
        payload: VerifyOtpPayload,
    ): Promise<BasicAuthResponse> => {
        const response =
            await apiClient.post<BasicAuthResponse>(
                'verifyOTP',
                payload,
            );

        return response.data;
    },

    updateClientPassword: async (
        payload: ResetPasswordPayload,
    ): Promise<BasicAuthResponse> => {
        const response =
            await apiClient.post<BasicAuthResponse>(
                'updatePassword',
                payload,
            );

        return response.data;
    },
};