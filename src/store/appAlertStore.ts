import { create } from 'zustand';

import {
    AppAlertButton,
    AppAlertConfig,
    AppAlertType,
} from '../types/appAlert.types';

type AppAlertState = {
    visible: boolean;
    type: AppAlertType;
    title: string;
    message: string;
    buttons: AppAlertButton[];
    dismissible: boolean;

    showAlert: (
        config: AppAlertConfig,
    ) => void;

    hideAlert: () => void;

    showSuccess: (
        title: string,
        message?: string,
        onPress?: () => void,
    ) => void;

    showError: (
        title: string,
        message?: string,
        onPress?: () => void,
    ) => void;

    showWarning: (
        title: string,
        message?: string,
    ) => void;

    showConfirm: (
        title: string,
        message: string,
        onConfirm: () => void | Promise<void>,
        options?: {
            confirmText?: string;
            cancelText?: string;
            destructive?: boolean;
        },
    ) => void;
};

const defaultState = {
    visible: false,
    type: 'info' as AppAlertType,
    title: '',
    message: '',
    buttons: [] as AppAlertButton[],
    dismissible: true,
};

export const useAppAlertStore =
    create<AppAlertState>((set, get) => ({
        ...defaultState,

        showAlert: config => {
            set({
                visible: true,
                type: config.type ?? 'info',
                title: config.title,
                message: config.message ?? '',
                buttons:
                    config.buttons &&
                        config.buttons.length > 0
                        ? config.buttons
                        : [
                            {
                                text: 'OK',
                                style: 'default',
                            },
                        ],
                dismissible:
                    config.dismissible ?? true,
            });
        },

        hideAlert: () => {
            set(defaultState);
        },

        showSuccess: (
            title,
            message = '',
            onPress,
        ) => {
            get().showAlert({
                type: 'success',
                title,
                message,
                buttons: [
                    {
                        text: 'OK',
                        style: 'success',
                        onPress,
                    },
                ],
            });
        },

        showError: (
            title,
            message = '',
            onPress,
        ) => {
            get().showAlert({
                type: 'error',
                title,
                message,
                buttons: [
                    {
                        text: 'OK',
                        style: 'destructive',
                        onPress,
                    },
                ],
            });
        },

        showWarning: (
            title,
            message = '',
        ) => {
            get().showAlert({
                type: 'warning',
                title,
                message,
                buttons: [
                    {
                        text: 'OK',
                        style: 'default',
                    },
                ],
            });
        },

        showConfirm: (
            title,
            message,
            onConfirm,
            options,
        ) => {
            get().showAlert({
                type: options?.destructive
                    ? 'error'
                    : 'confirm',

                title,
                message,

                dismissible: false,

                buttons: [
                    {
                        text:
                            options?.cancelText ??
                            'Cancel',
                        style: 'cancel',
                    },
                    {
                        text:
                            options?.confirmText ??
                            'Confirm',

                        style: options?.destructive
                            ? 'destructive'
                            : 'success',

                        onPress: onConfirm,
                    },
                ],
            });
        },
    }));