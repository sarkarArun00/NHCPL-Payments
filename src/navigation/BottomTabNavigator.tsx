import React from 'react';
import {
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import DashboardScreen from '../screens/dashboard/DashboardScreen';
import VoucherListScreen from '../screens/vouchers/VoucherListScreen';
import ApprovalListScreen from '../screens/approvals/ApprovalListScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

import {BottomTabParamList} from './navigationTypes';
import {Colors} from '../constants/colors';

const Tab = createBottomTabNavigator<BottomTabParamList>();

export default function BottomTabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarHideOnKeyboard: true,

        tabBarStyle: {
          height: 68 + insets.bottom,
          paddingTop: 7,
          paddingBottom: Math.max(
            insets.bottom,
            8,
          ),
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          backgroundColor: Colors.surface,
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({color, size}) => (
            <MaterialDesignIcons
              name="view-dashboard-outline"
              size={24}
              color={color}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Vouchers"
        component={VoucherListScreen}
        options={{
          tabBarLabel: 'Vouchers',
          tabBarIcon: ({color, size}) => (
            <MaterialDesignIcons
            name="receipt-text-outline"
            size={24}
            color={color}
          />
          ),
        }}
      />

<Tab.Screen
  name="Approvals"
  component={ApprovalListScreen}
  options={{
    tabBarLabel: 'Checklist',
    tabBarIcon: ({color, size}) => (
      <MaterialDesignIcons
        name="clipboard-check-outline"
        size={size}
        color={color}
      />
    ),
  }}
/>

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({color, size}) => (
            <MaterialDesignIcons
            name="account-outline"
            size={24}
            color={color}
          />
          ),
        }}
      />
    </Tab.Navigator>
  );
}