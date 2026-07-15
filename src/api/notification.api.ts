import { apiClient } from './apiClient';

export const notificationApi = {
    getGeneralNotifications:
        async (): Promise<unknown> => {
            const response =
                await apiClient.get<unknown>(
                    'global/notifications/getGeneralNotificationV2',
                );

            return response.data;
        },

    updateNotificationStatus:
        async (): Promise<unknown> => {
            const response =
                await apiClient.post<unknown>(
                    'operation/logistics/updateNotificationStatus',
                    {},
                );

            return response.data;
        },
    
    deleteGeneralNotification:
        async (
            id: string,
        ): Promise<unknown> => {
            const response =
                await apiClient.delete<unknown>(
                    `global/notifications/deleteNotification/${encodeURIComponent(
                        id,
                    )}`,
                );

            return response.data;
        },
};