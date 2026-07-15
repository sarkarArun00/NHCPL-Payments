import React from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  MaterialDesignIcons,
} from '@react-native-vector-icons/material-design-icons/static';

import {Colors} from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import {useCenterStore} from '../../store/centerStore';
import {API_CONFIG} from '../../api/apiConfig';

export default function ProfileScreen() {
  const session = useAuthStore(state => state.session);


const logout = useAuthStore(
  state => state.logout,
);

const selectedCenter =
  useCenterStore(
    state => state.selectedCenter,
  );

const selectedCenterId =
  useCenterStore(
    state => state.selectedCenterId,
  );

const centers =
  useCenterStore(
    state => state.centers,
  );

const employee = session?.employee;

  const photoUri = employee?.employeePhoto
    ? `${API_CONFIG.BASE_URL}${employee.employeePhoto}`
    : null;
  
  const activeCenterId = Number(
  selectedCenterId ??
    session?.centreId ??
    0,
);

const activeCenter =
  selectedCenter ??
  centers.find(
    center =>
      Number(center.id) ===
      activeCenterId,
  ) ??
  null;

const centerName =
  activeCenter?.name ||
  activeCenter?.centre_name ||
  activeCenter?.center_name ||
  activeCenter?.centreName ||
  activeCenter?.centerName ||
  (activeCenterId > 0
    ? `Center ${activeCenterId}`
    : 'Not available');

  const handleLogout = () => {
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: () => {
            logout().catch(error => {
              console.error('Logout failed:', error);
            });
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          {photoUri ? (
            <Image
              source={{uri: photoUri}}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <MaterialDesignIcons
                name="account"
                size={42}
                color={Colors.primary}
              />
            </View>
          )}

          <Text style={styles.name}>
            {employee?.employee_name || 'Employee'}
          </Text>

          <Text style={styles.designation}>
            {employee?.userTypeName || 'User'}
          </Text>

          <Text style={styles.employeeCode}>
            {employee?.employee_code || ''}
          </Text>
        </View>

        <View style={styles.detailsCard}>
          <ProfileRow
            icon="email-outline"
            label="Email"
            value={employee?.email_id || 'Not available'}
          />

          <ProfileRow
            icon="phone-outline"
            label="Phone"
            value={
              employee?.phoneNumber || 'Not available'
            }
          />

          <ProfileRow
            icon="office-building-outline"
            label="Centre"
            value={centerName}
          />

          <ProfileRow
            icon="account-key-outline"
            label="User type"
            value={employee?.userTypeName || 'Not available'}
            showDivider={false}
          />
        </View>

        <Pressable
          style={styles.logoutButton}
          onPress={handleLogout}>
          <MaterialDesignIcons
            name="logout"
            size={21}
            color={Colors.danger}
          />

          <Text style={styles.logoutText}>
            Sign out
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

type ProfileRowProps = {
  icon: React.ComponentProps<
    typeof MaterialDesignIcons
  >['name'];
  label: string;
  value: string;
  showDivider?: boolean;
};

function ProfileRow({
  icon,
  label,
  value,
  showDivider = true,
}: ProfileRowProps) {
  return (
    <View
      style={[
        styles.profileRow,
        showDivider && styles.profileRowDivider,
      ]}>
      <View style={styles.rowIcon}>
        <MaterialDesignIcons
          name={icon}
          size={21}
          color={Colors.primary}
        />
      </View>

      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  content: {
    padding: 16,
    paddingBottom: 32,
  },

  profileCard: {
    padding: 24,
    borderRadius: 22,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  avatar: {
    width: 92,
    height: 92,
    borderRadius: 30,
    backgroundColor: Colors.primaryLight,
  },

  avatarFallback: {
    width: 92,
    height: 92,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },

  name: {
    marginTop: 16,
    color: Colors.textPrimary,
    fontSize: 21,
    fontWeight: '800',
  },

  designation: {
    marginTop: 5,
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },

  employeeCode: {
    marginTop: 5,
    color: Colors.textMuted,
    fontSize: 12,
  },

  detailsCard: {
    marginTop: 16,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  profileRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
  },

  profileRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },

  rowContent: {
    flex: 1,
    marginLeft: 13,
  },

  rowLabel: {
    color: Colors.textMuted,
    fontSize: 11,
  },

  rowValue: {
    marginTop: 4,
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },

  logoutButton: {
    minHeight: 54,
    marginTop: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    backgroundColor: Colors.dangerLight,
  },

  logoutText: {
    color: Colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
});