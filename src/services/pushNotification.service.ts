import {
    Alert,
    Linking,
    PermissionsAndroid,
    Platform,
} from 'react-native';
import {
    pushNotificationApi,
    DeviceType,
} from '../api/pushNotification.api';

import notifee, {
    AndroidImportance,
} from '@notifee/react-native';

import {
    getMessaging,
    getToken,
    onMessage,
    onTokenRefresh,
    RemoteMessage,
} from '@react-native-firebase/messaging';

const isAndroidNotificationPermissionRequired =
    (): boolean => {
        return (
            Platform.OS === 'android' &&
            Number(Platform.Version) >= 33
        );
    };

const openAppSettings = async () => {
    try {
        await Linking.openSettings();
    } catch (error) {
        console.log(
            'Unable to open app settings:',
            error,
        );
    }
};

const showNotificationPermissionAlert =
    () => {
        Alert.alert(
            'Allow Notifications',
            'Please allow notifications to receive voucher approvals, payment updates, and important account alerts.',
            [
                {
                    text: 'Not now',
                    style: 'cancel',
                },
                {
                    text: 'Open Settings',
                    onPress: () => {
                        void openAppSettings();
                    },
                },
            ],
        );
    };

export const requestAndroidNotificationPermission =
    async (
        showSettingsAlert = true,
    ): Promise<boolean> => {
        if (
            !isAndroidNotificationPermissionRequired()
        ) {
            return true;
        }

        const permission =
            PermissionsAndroid.PERMISSIONS
                .POST_NOTIFICATIONS;

        const alreadyGranted =
            await PermissionsAndroid.check(
                permission,
            );

        if (alreadyGranted) {
            return true;
        }

        const result =
            await PermissionsAndroid.request(
                permission,
                {
                    title: 'Allow Notifications',
                    message:
                        'NHCPL Payments needs notification permission to send voucher approvals, payment updates, and important account alerts.',
                    buttonPositive: 'Allow',
                    buttonNegative: 'Deny',
                },
            );

        if (
            result ===
            PermissionsAndroid.RESULTS.GRANTED
        ) {
            return true;
        }

        if (showSettingsAlert) {
            showNotificationPermissionAlert();
        }

        return false;
    };

export const getAndroidFcmToken =
    async (
        showPermissionAlert = true,
    ): Promise<string | null> => {
        try {
            const hasPermission =
                await requestAndroidNotificationPermission(
                    showPermissionAlert,
                );

            if (!hasPermission) {
                console.log(
                    'FCM permission denied. User must enable notification permission from app settings.',
                );

                return null;
            }

            const messaging =
                getMessaging();

            const token =
                await getToken(messaging);

            console.log(
                'ANDROID FCM TOKEN:',
                token,
            );

            return token || null;
        } catch (error) {
            console.log(
                'Unable to get FCM token:',
                error,
            );

            return null;
        }
    };

export const subscribeToFcmTokenRefresh =
    (
        callback?: (
            token: string,
        ) => void,
    ): (() => void) => {
        const messaging =
            getMessaging();

        return onTokenRefresh(
            messaging,
            token => {
                console.log(
                    'ANDROID FCM TOKEN REFRESHED:',
                    token,
                );

                callback?.(token);
            },
        );
    };

const toNotificationText = (
    value: unknown,
    fallback: string,
): string => {
    if (
        typeof value === 'string' &&
        value.trim()
    ) {
        return value.trim();
    }

    if (
        typeof value === 'number' ||
        typeof value === 'boolean'
    ) {
        return String(value);
    }

    return fallback;
};

const toNotificationData = (
    data: RemoteMessage['data'],
): Record<string, string> => {
    if (!data) {
        return {};
    }

    return Object.entries(data).reduce<
        Record<string, string>
    >((result, [key, value]) => {
        if (
            value === null ||
            value === undefined
        ) {
            return result;
        }

        if (typeof value === 'string') {
            result[key] = value;
            return result;
        }

        result[key] = JSON.stringify(value);
        return result;
    }, {});
};

const displayForegroundNotification =
    async (
        message: RemoteMessage,
    ): Promise<void> => {
        const title =
            toNotificationText(
                message.notification?.title ??
                message.data?.title,
                'NHCPL Payments',
            );

        const body =
            toNotificationText(
                message.notification?.body ??
                message.data?.body,
                'You have a new notification.',
            );

        const notificationData =
            toNotificationData(
                message.data,
            );

        const channelId =
            await notifee.createChannel({
                id: 'nhcpl-payments',
                name: 'NHCPL Payments',
                importance:
                    AndroidImportance.HIGH,
            });

        await notifee.displayNotification({
            title,
            body,
            data: notificationData,
            android: {
                channelId,
                smallIcon: 'ic_launcher',
                pressAction: {
                    id: 'default',
                },
            },
        });
    };

export const subscribeToForegroundMessages =
    (
        callback?: (
            message: RemoteMessage,
        ) => void,
    ): (() => void) => {
        const messaging =
            getMessaging();

        return onMessage(
            messaging,
            async message => {
                console.log(
                    'FOREGROUND FCM MESSAGE:',
                    JSON.stringify(
                        message,
                        null,
                        2,
                    ),
                );

                try {
                    await displayForegroundNotification(
                        message,
                    );
                } catch (error) {
                    console.log(
                        'Unable to show foreground notification:',
                        error,
                    );
                }

                callback?.(message);
            },
        );
    };


const getDeviceType =
    (): DeviceType => {
        if (Platform.OS === 'android') {
            return 'android';
        }

        if (Platform.OS === 'ios') {
            return 'ios';
        }

        return 'web';
    };

export const saveFcmTokenForUser =
    async (
        userId: number,
        deviceToken: string,
    ): Promise<boolean> => {
        if (userId <= 0 || !deviceToken) {
            return false;
        }

        try {
            await pushNotificationApi.saveToken({
                user_id: userId,
                device_token: deviceToken,
                device_type: getDeviceType(),
            });

            console.log(
                'FCM token saved successfully',
            );

            return true;
        } catch (error) {
            console.log(
                'Unable to save FCM token:',
                error,
            );

            return false;
        }
    };

export const registerFcmTokenForUser =
    async (
        userId: number,
        showPermissionAlert = true,
    ): Promise<string | null> => {
        const token =
            await getAndroidFcmToken(
                showPermissionAlert,
            );

        if (token) {
            await saveFcmTokenForUser(
                userId,
                token,
            );
        }

        return token;
    };