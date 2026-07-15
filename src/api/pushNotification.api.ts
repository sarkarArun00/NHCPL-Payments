import { apiClient } from './apiClient';

export type DeviceType =
    | 'web'
    | 'android'
    | 'ios';

export type SaveDeviceTokenPayload = {
    user_id: number;
    device_token: string;
    device_type: DeviceType;
};

export const pushNotificationApi = {
    saveToken: async (
        payload: SaveDeviceTokenPayload,
    ): Promise<unknown> => {
        const response =
            await apiClient.post<unknown>(
                'notifications/save-token',
                payload,
            );

        return response.data;
    },
};