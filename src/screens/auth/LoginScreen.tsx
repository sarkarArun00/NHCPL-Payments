import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Image,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  MaterialDesignIcons,
} from '@react-native-vector-icons/material-design-icons/static';

import {
  useNavigation,
} from '@react-navigation/native';

import {
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';

import {
  RootStackParamList,
} from '../../navigation/navigationTypes';

import {Colors} from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { useCenterStore } from '../../store/centerStore';

type LoginNavigation =
  NativeStackNavigationProp<
    RootStackParamList,
    'Login'
  >;

export default function LoginScreen() {
    const navigation =
    useNavigation<LoginNavigation>();
  const login = useAuthStore(state => state.login);
const resetCenter = useCenterStore(
  state => state.resetCenter,
);
  const isLoggingIn = useAuthStore(
    state => state.isLoggingIn,
  );

  const loginError = useAuthStore(
    state => state.loginError,
  );

  const clearLoginError = useAuthStore(
    state => state.clearLoginError,
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('21');
  const [showPassword, setShowPassword] = useState(false);

  const [validationError, setValidationError] =
    useState<string | null>(null);

  useEffect(() => {
    setValidationError(null);
    clearLoginError();
  }, [email, password, department, clearLoginError]);

  const handleLogin = async () => {
    if (isLoggingIn) {
      return;
    }

    Keyboard.dismiss();
    setValidationError(null);
    clearLoginError();

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedDepartment = department.trim();

    if (!normalizedEmail) {
      setValidationError(
        'Please enter your email address.',
      );
      return;
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalizedEmail)) {
      setValidationError(
        'Please enter a valid email address.',
      );
      return;
    }

    if (!password.trim()) {
      setValidationError(
        'Please enter your password.',
      );
      return;
    }

    const departmentId = Number(normalizedDepartment);

    if (
      !normalizedDepartment ||
      Number.isNaN(departmentId) ||
      departmentId <= 0
    ) {
      setValidationError(
        'Please enter a valid department ID.',
      );
      return;
    }

      resetCenter();

      const isSuccessful = await login({
        domain: 'nirnayan',
        email: normalizedEmail,
        emailOrMobile: normalizedEmail,
        user_pass: password,
        department: departmentId,
      });

    console.log(
      'LOGIN COMPLETED:',
      isSuccessful,
    );

    if (!isSuccessful) {
      return;
    }

    // Do not call navigation.navigate() here.
    // AppNavigator will automatically display MainTabs
    // after authStore sets isAuthenticated to true.
  };

  const visibleError =
    validationError || loginError;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Colors.primary}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.topSection}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.appName}>
              Nirnayan Payments
            </Text>

            <Text style={styles.appTagline}>
              Secure payment voucher and approval management
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.welcomeTitle}>
              Welcome back
            </Text>

            <Text style={styles.welcomeSubtitle}>
              Sign in with your employee account
            </Text>

            {visibleError ? (
              <View style={styles.errorContainer}>
                <MaterialDesignIcons
                  name="alert-circle-outline"
                  size={20}
                  color={Colors.danger}
                />

                <Text style={styles.errorText}>
                  {visibleError}
                </Text>
              </View>
            ) : null}

            <Text style={styles.inputLabel}>
              Email address
            </Text>

            <View style={styles.inputContainer}>
              <MaterialDesignIcons
                name="email-outline"
                size={21}
                color={Colors.textMuted}
              />

              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your official email"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                editable={!isLoggingIn}
                style={styles.input}
              />
            </View>

            <Text style={styles.inputLabel}>
              Password
            </Text>

            <View style={styles.inputContainer}>
              <MaterialDesignIcons
                name="lock-outline"
                size={21}
                color={Colors.textMuted}
              />

              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                editable={!isLoggingIn}
                style={styles.input}
              />

              <Pressable
                hitSlop={10}
                disabled={isLoggingIn}
                onPress={() =>
                  setShowPassword(current => !current)
                }>
                <MaterialDesignIcons
                  name={
                    showPassword
                      ? 'eye-off-outline'
                      : 'eye-outline'
                  }
                  size={22}
                  color={Colors.textSecondary}
                />
              </Pressable>
                        </View>

            <Pressable
              disabled={isLoggingIn}
              onPress={() =>
                navigation.navigate(
                  'ForgotPassword',
                )
              }
              style={({pressed}) => [
                styles.forgotPasswordButton,
                pressed &&
                  styles.loginButtonPressed,
              ]}>
              <Text
                style={
                  styles.forgotPasswordText
                }>
                Forgot Password?
              </Text>
            </Pressable>

            {/* <Text style={styles.inputLabel}>
              Department ID

            {/* <Text style={styles.inputLabel}>
              Department ID
            </Text>

            <View style={styles.inputContainer}>
              <MaterialDesignIcons
                name="office-building-outline"
                size={21}
                color={Colors.textMuted}
              />

              <TextInput
                value={department}
                onChangeText={setDepartment}
                placeholder="Department ID"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                editable={!isLoggingIn}
                style={styles.input}
              />
            </View> */}

            <Pressable
              disabled={isLoggingIn}
              onPress={handleLogin}
              style={({pressed}) => [
                styles.loginButton,
                pressed &&
                  !isLoggingIn &&
                  styles.loginButtonPressed,
                isLoggingIn &&
                  styles.loginButtonDisabled,
              ]}>
              {isLoggingIn ? (
                <>
                  <ActivityIndicator
                    size="small"
                    color={Colors.white}
                  />

                  <Text style={styles.loginButtonText}>
                    Signing in...
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.loginButtonText}>
                    Sign in
                  </Text>

                  <MaterialDesignIcons
                    name="arrow-right"
                    size={22}
                    color={Colors.white}
                  />
                </>
              )}
            </Pressable>

            <Text style={styles.securityText}>
              Your account is protected with secure
              token-based authentication.
            </Text>
          </View>

          <Text style={styles.footerText}>
            Nirnayan Health Care Private Limited.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.primary,
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    backgroundColor: Colors.background,
  },

  topSection: {
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 66,
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
  },

  logoContainer: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  logoImage: {
  width: 58,
  height: 58,
},

  appName: {
    marginTop: 18,
    color: Colors.white,
    fontSize: 25,
    fontWeight: '800',
  },

  appTagline: {
    marginTop: 8,
    maxWidth: 290,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    lineHeight: 19,
  },

  formCard: {
    marginHorizontal: 18,
    marginTop: -34,
    padding: 22,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 5,
  },

  welcomeTitle: {
    color: Colors.textPrimary,
    fontSize: 23,
    fontWeight: '800',
  },

  welcomeSubtitle: {
    marginTop: 6,
    marginBottom: 22,
    color: Colors.textSecondary,
    fontSize: 13,
  },

  errorContainer: {
    marginBottom: 18,
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
  },

  errorText: {
    flex: 1,
    marginLeft: 9,
    color: Colors.danger,
    fontSize: 12,
    lineHeight: 17,
  },

  inputLabel: {
    marginBottom: 8,
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },

  inputContainer: {
    minHeight: 54,
    marginBottom: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
  },

  input: {
    flex: 1,
    marginLeft: 10,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontSize: 14,
  },

  loginButton: {
    minHeight: 55,
    marginTop: 5,
    borderRadius: 15,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 9,
    backgroundColor: Colors.primary,
  },

    forgotPasswordButton: {
    marginTop: -6,
    marginBottom: 16,
    alignSelf: 'flex-end',
  },

  forgotPasswordText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },

  loginButtonPressed: {
    opacity: 0.88,
  },

  loginButtonDisabled: {
    opacity: 0.65,
  },

  loginButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },

  securityText: {
    marginTop: 16,
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },

  footerText: {
    marginTop: 26,
    marginBottom: 24,
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: 12,
  },
});