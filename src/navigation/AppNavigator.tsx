import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
} from '@react-navigation/native';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';


import BottomTabNavigator from './BottomTabNavigator';
import LoginScreen from '../screens/auth/LoginScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import CreateVoucherScreen from '../screens/vouchers/CreateVoucherScreen';

import {RootStackParamList} from './navigationTypes';
import {Colors} from '../constants/colors';
import { useAuthStore } from '../store/authStore';
import VoucherDetailsScreen from '../screens/vouchers/VoucherDetailsScreen';
import NotificationScreen from '../screens/notifications/NotificationScreen';
import AppAlertModal from '../components/AppAlertModal';

// import {
//   getAndroidFcmToken,
//   subscribeToFcmTokenRefresh,
//   subscribeToForegroundMessages,
// } from '../services/pushNotification.service';

import {
  registerFcmTokenForUser,
  saveFcmTokenForUser,
  subscribeToFcmTokenRefresh,
  subscribeToForegroundMessages,
} from '../services/pushNotification.service';
import SingleVoucherScreen from '../screens/vouchers/SingleVoucherScreen';

const Stack =
  createNativeStackNavigator<RootStackParamList>();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.surface,
    text: Colors.textPrimary,
    border: Colors.border,
  },
};

export default function AppNavigator() {
  const isAuthenticated = useAuthStore(
    state => state.isAuthenticated,
  );

  const isInitializing = useAuthStore(
    state => state.isInitializing,
  );

    const session = useAuthStore(
    state => state.session,
    );
  
    React.useEffect(() => {
  const employeeId = Number(
    session?.employee?.id ?? 0,
  );

  if (employeeId <= 0) {
    return;
  }

  /*
   * Ask permission, get FCM token,
   * then save token to backend.
   */
void registerFcmTokenForUser(
  employeeId,
  true,
);

  /*
   * Save refreshed token also.
   */
  const unsubscribeTokenRefresh =
    subscribeToFcmTokenRefresh(
      token => {
        void saveFcmTokenForUser(
          employeeId,
          token,
        );
      },
    );

  const unsubscribeForegroundMessages =
    subscribeToForegroundMessages();

  return () => {
    unsubscribeTokenRefresh();
    unsubscribeForegroundMessages();
  };
}, [session?.employee?.id]);
  
  if (isInitializing) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator
          size="large"
          color={Colors.primary}
        />
      </View>
    );
  }

return (
  <SafeAreaProvider
    initialMetrics={initialWindowMetrics}>
    <NavigationContainer
      theme={navigationTheme}>
      <Stack.Navigator>
        {isAuthenticated ? (
          <>
            <Stack.Screen
              name="MainTabs"
              component={BottomTabNavigator}
              options={{
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="CreateVoucher"
              component={CreateVoucherScreen}
              options={{
                title: 'Create Payment Voucher',
                headerShadowVisible: false,
                headerTintColor:
                  Colors.textPrimary,
                headerStyle: {
                  backgroundColor:
                    Colors.surface,
                },
              }}
            />

            <Stack.Screen
              name="VoucherDetails"
              component={VoucherDetailsScreen}
              options={{
                title: 'Voucher Details',
                headerShadowVisible: false,
                headerTintColor:
                  Colors.textPrimary,
                headerStyle: {
                  backgroundColor:
                    Colors.surface,
                },
              }}
            />

            <Stack.Screen
              name="Notification"
              component={NotificationScreen}
              options={{
                title: 'Notifications',
                headerShadowVisible: false,
                headerTintColor:
                  Colors.textPrimary,
                headerStyle: {
                  backgroundColor:
                    Colors.surface,
                },
              }}
            />

            <Stack.Screen
            name="SingleVoucher"
            component={SingleVoucherScreen}
            options={{
              title: 'Create Single Voucher',
              headerShadowVisible: false,
              headerTintColor: Colors.textPrimary,
              headerStyle: {
                backgroundColor: Colors.surface,
              },
            }}
          />
            
          </>
        ) : (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{
                headerShown: false,
                animationTypeForReplace:
                  'pop',
              }}
            />

            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
              options={{
                headerShown: false,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>

    <AppAlertModal />
  </SafeAreaProvider>
);
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});