import { create } from 'zustand';

import {
    notificationApi,
} from '../api/notification.api';

import {
    GeneralNotification,
} from '../types/notification.types';

type NotificationState = {
    notifications: GeneralNotification[];

    unreadCount: number;

    isLoading: boolean;
    isRefreshing: boolean;

    error: string | null;

    loadNotifications: (
        refresh?: boolean,
    ) => Promise<void>;

    updateNotificationStatus:
    () => Promise<boolean>;

    deleteGeneralNotification: (
        id: string,
    ) => Promise<boolean>;

    clearNotificationError:
    () => void;

    resetNotifications:
    () => void;
};

const isRecord = (
    value: unknown,
): value is Record<
    string,
    unknown
> => {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
    );
};

const toNullableString = (
    value: unknown,
): string | null => {
    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    const normalizedValue =
        String(value).trim();

    return normalizedValue ||
        null;
};

const toNullableNumber = (
    value: unknown,
): number | null => {
    if (
        value === null ||
        value === undefined ||
        value === ''
    ) {
        return null;
    }

    const numericValue =
        Number(value);

    return Number.isFinite(
        numericValue,
    )
        ? numericValue
        : null;
};

const toNullablePrimitive = (
    value: unknown,
):
    | string
    | number
    | boolean
    | null => {
    if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
    ) {
        return value;
    }

    return null;
};

const toNullableStringOrNumber = (
    value: unknown,
): string | number | null => {
    if (typeof value === 'string') {
        const normalizedValue =
            value.trim();

        return normalizedValue ||
            null;
    }

    if (
        typeof value === 'number' &&
        Number.isFinite(value)
    ) {
        return value;
    }

    return null;
};

const normalizeIsRead = (
    value: unknown,
): boolean => {
    if (
        value === true ||
        value === 1
    ) {
        return true;
    }

    if (
        typeof value === 'string'
    ) {
        return (
            value
                .trim()
                .toLowerCase() ===
            'true'
        );
    }

    return false;
};



const normalizeNotification = (
    item: Record<
        string,
        unknown
    >,
): GeneralNotification | null => {
    const id =
        toNullableString(item.id);

    if (!id) {
        return null;
    }

    return {
        id,

        pageId:
            toNullableStringOrNumber(
                item.pageId,
            ),

        taskId:
            toNullableStringOrNumber(
                item.taskId,
            ),
        message:
            toNullableString(
                item.message,
            ) || '',

        srcEmp:
            toNullableNumber(
                item.srcEmp,
            ),

        tgtEmp:
            toNullableNumber(
                item.tgtEmp,
            ),

        module:
            toNullableString(
                item.module,
            ),

        srcModule:
            toNullableString(
                item.srcModule,
            ),

        notificationType:
            toNullableString(
                item.notificationType,
            ),

        runnableQuery:
            toNullableString(
                item.runnableQuery,
            ),

        pageLink:
            toNullableString(
                item.pageLink,
            ),

        runnableStatus:
            toNullablePrimitive(
                item.runnableStatus,
            ),

        denialQuery:
            toNullableString(
                item.denialQuery,
            ),

        referenceId:
            toNullableString(
                item.referenceId,
            ),

        status:
            toNullablePrimitive(
                item.status,
            ),

        isRead:
            normalizeIsRead(
                item.isRead,
            ),

        createdAt:
            toNullableString(
                item.createdAt,
            ) || '',

        updatedAt:
            toNullableString(
                item.updatedAt,
            ) || '',
    };
};

const extractNotifications = (
    response: unknown,
): GeneralNotification[] => {
    const responseRecord =
        isRecord(response)
            ? response
            : null;

    const responseData =
        responseRecord?.data;

    const dataRecord =
        isRecord(responseData)
            ? responseData
            : null;

    const possibleLists: unknown[] =
        [
            response,

            responseData,

            dataRecord?.data,

            responseRecord
                ?.records,

            dataRecord?.records,

            responseRecord
                ?.notifications,

            dataRecord
                ?.notifications,
        ];

    const notificationList =
        possibleLists.find(
            item =>
                Array.isArray(item),
        );

    if (
        Array.isArray(
            notificationList,
        )
    ) {
        return notificationList
            .filter(isRecord)
            .map(
                normalizeNotification,
            )
            .filter(
                (
                    notification,
                ): notification is GeneralNotification =>
                    notification !==
                    null,
            );
    }

    /*
     * Also supports an API response
     * containing one notification
     * object directly.
     */
    const possibleSingleItems:
        unknown[] = [
            response,
            responseData,
        ];

    const singleItem =
        possibleSingleItems.find(
            item =>
                isRecord(item) &&
                Boolean(item.id),
        );

    if (isRecord(singleItem)) {
        const notification =
            normalizeNotification(
                singleItem,
            );

        return notification
            ? [notification]
            : [];
    }

    return [];
};

const isFailedResponse = (
    response: unknown,
): boolean => {
    if (!isRecord(response)) {
        return false;
    }

    return (
        response.status === 0 ||
        response.status ===
        false ||
        response.success === false
    );
};

const getResponseMessage = (
    response: unknown,
): string | null => {
    if (!isRecord(response)) {
        return null;
    }

    return toNullableString(
        response.message,
    );
};

export const useNotificationStore =
    create<NotificationState>(
        (set, get) => ({
            notifications: [],
            unreadCount: 0,

            isLoading: false,
            isRefreshing: false,

            error: null,

            loadNotifications:
                async (
                    refresh = false,
                ) => {
                    set({
                        isLoading:
                            !refresh,

                        isRefreshing:
                            refresh,

                        error: null,
                    });

                    try {
                        const response =
                            await notificationApi
                                .getGeneralNotifications();

                        if (
                            isFailedResponse(
                                response,
                            )
                        ) {
                            throw new Error(
                                getResponseMessage(
                                    response,
                                ) ||
                                'Unable to load notifications',
                            );
                        }

                        const allNotifications =
                            extractNotifications(
                                response,
                            );

                        /*
                         * Only Accounts module
                         * notifications are shown.
                         */
                        const accountsNotifications =
                            allNotifications.filter(
                                notification =>
                                    String(
                                        notification
                                            .module ||
                                        '',
                                    )
                                        .trim()
                                        .toLowerCase() ===
                                    'accounts' || 'Expense',
                            );

                        const unreadCount =
                            accountsNotifications.filter(
                                notification =>
                                    notification
                                        .isRead ===
                                    false,
                            ).length;

                        set({
                            notifications:
                                accountsNotifications,

                            unreadCount,

                            isLoading:
                                false,

                            isRefreshing:
                                false,

                            error: null,
                        });
                    } catch (
                    error: unknown
                    ) {
                        const apiError =
                            error as {
                                response?: {
                                    data?: {
                                        message?: string;
                                    };
                                };

                                message?: string;
                            };

                        set({
                            isLoading:
                                false,

                            isRefreshing:
                                false,

                            error:
                                apiError
                                    ?.response
                                    ?.data
                                    ?.message ||
                                apiError
                                    ?.message ||
                                'Unable to load notifications',
                        });
                    }
                },

            clearNotificationError:
                () => {
                    set({
                        error: null,
                    });
                },

            deleteGeneralNotification:
                async (
                    id: string,
                ): Promise<boolean> => {
                    if (!id) {
                        set({
                            error:
                                'Notification ID is not available.',
                        });

                        return false;
                    }

                    try {
                        const response =
                            await notificationApi
                                .deleteGeneralNotification(
                                    id,
                                );

                        if (
                            isFailedResponse(
                                response,
                            )
                        ) {
                            throw new Error(
                                getResponseMessage(
                                    response,
                                ) ||
                                'Unable to delete notification',
                            );
                        }

                        const remainingNotifications =
                            get().notifications.filter(
                                notification =>
                                    notification.id !== id,
                            );

                        const unreadCount =
                            remainingNotifications.filter(
                                notification =>
                                    notification.isRead ===
                                    false,
                            ).length;

                        set({
                            notifications:
                                remainingNotifications,

                            unreadCount,

                            error: null,
                        });

                        /*
                         * Refresh from server after delete
                         * so Dashboard badge and list stay synced.
                         */
                        await get()
                            .loadNotifications(true);

                        return true;
                    } catch (
                    error: unknown
                    ) {
                        const apiError =
                            error as {
                                response?: {
                                    data?: {
                                        message?: string;
                                    };
                                };

                                message?: string;
                            };

                        set({
                            error:
                                apiError
                                    ?.response
                                    ?.data
                                    ?.message ||
                                apiError?.message ||
                                'Unable to delete notification',
                        });

                        return false;
                    }
                },
            
            updateNotificationStatus:
                async (): Promise<boolean> => {
                    try {
                        const response =
                            await notificationApi
                                .updateNotificationStatus();

                        if (
                            isFailedResponse(
                                response,
                            )
                        ) {
                            throw new Error(
                                getResponseMessage(
                                    response,
                                ) ||
                                'Unable to update notification status',
                            );
                        }

                        await get()
                            .loadNotifications(true);

                        return true;
                    } catch (
                    error: unknown
                    ) {
                        const apiError =
                            error as {
                                response?: {
                                    data?: {
                                        message?: string;
                                    };
                                };

                                message?: string;
                            };

                        set({
                            error:
                                apiError
                                    ?.response
                                    ?.data
                                    ?.message ||
                                apiError?.message ||
                                'Unable to update notification status',
                        });

                        return false;
                    }
                },
            
            resetNotifications:
                () => {
                    set({
                        notifications:
                            [],

                        unreadCount: 0,

                        isLoading:
                            false,

                        isRefreshing:
                            false,

                        error: null,
                    });
                },
        }),
    );