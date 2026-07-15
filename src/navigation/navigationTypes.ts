import {
    NavigatorScreenParams,
} from '@react-navigation/native';

export type MainTabParamList = {
    Dashboard: undefined;
    VoucherList: undefined;
    VoucherDetails: undefined;
    Profile: undefined;
};

export type RootStackParamList = {
    Login: undefined;

    MainTabs:
    NavigatorScreenParams<
        MainTabParamList
    >;

    Notification: undefined;
    ForgotPassword: undefined;
};

export type BottomTabParamList = {
    Dashboard: undefined;
    Vouchers: undefined;
    Approvals: undefined;
    Profile: undefined;
};
