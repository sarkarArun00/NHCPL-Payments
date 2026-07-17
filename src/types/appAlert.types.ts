export type AppAlertType =
    | 'success'
    | 'error'
    | 'warning'
    | 'info'
    | 'confirm';

export type AppAlertButtonStyle =
    | 'default'
    | 'cancel'
    | 'destructive'
    | 'success';

export type AppAlertButton = {
    text: string;
    style?: AppAlertButtonStyle;
    onPress?: () => void | Promise<void>;
};

export type AppAlertConfig = {
    visible?: boolean;
    type?: AppAlertType;
    title: string;
    message?: string;
    buttons?: AppAlertButton[];
    dismissible?: boolean;
};