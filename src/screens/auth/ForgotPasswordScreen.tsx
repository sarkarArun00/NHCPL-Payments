import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  useNavigation,
} from '@react-navigation/native';

import {
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';

import {
  MaterialDesignIcons,
} from '@react-native-vector-icons/material-design-icons/static';

import {
  authApi,
} from '../../api/auth.api';

import {
  Colors,
} from '../../constants/colors';

import {
  RootStackParamList,
} from '../../navigation/navigationTypes';

type ForgotStep =
  | 'EMAIL'
  | 'OTP'
  | 'RESET';

type ForgotPasswordNavigation =
  NativeStackNavigationProp<
    RootStackParamList,
    'ForgotPassword'
  >;

const emailPattern =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isSuccessResponse = (
  response: unknown,
): boolean => {
  const record =
    typeof response === 'object' &&
    response !== null
      ? response as {
          status?: unknown;
          success?: unknown;
        }
      : null;

  if (!record) {
    return false;
  }

  if (
    record.status !== undefined &&
    record.status !== null
  ) {
    return Number(record.status) === 1;
  }

  return record.success === true;
};

const getResponseMessage = (
  response: unknown,
  fallback: string,
): string => {
  const record =
    typeof response === 'object' &&
    response !== null
      ? response as {
          message?: unknown;
          data?: unknown;
        }
      : null;

  if (
    typeof record?.message ===
      'string' &&
    record.message.trim()
  ) {
    return record.message.trim();
  }

  if (
    typeof record?.data === 'string' &&
    record.data.trim()
  ) {
    return record.data.trim();
  }

  return fallback;
};

export default function ForgotPasswordScreen() {
  const navigation =
    useNavigation<ForgotPasswordNavigation>();

  const [step, setStep] =
    useState<ForgotStep>('EMAIL');

  const [email, setEmail] =
    useState('');

  const [otp, setOtp] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('');

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [
    resendSeconds,
    setResendSeconds,
  ] = useState(0);

  const [
    isRequestingOtp,
    setIsRequestingOtp,
  ] = useState(false);

  const [
    isVerifyingOtp,
    setIsVerifyingOtp,
  ] = useState(false);

  const [
    isResettingPassword,
    setIsResettingPassword,
  ] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const normalizedEmail =
    useMemo(
      () =>
        email.trim().toLowerCase(),
      [email],
    );

  const isBusy =
    isRequestingOtp ||
    isVerifyingOtp ||
    isResettingPassword;

  useEffect(() => {
    if (resendSeconds <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setResendSeconds(
        current =>
          Math.max(current - 1, 0),
      );
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [resendSeconds]);

  const startResendTimer = () => {
    setResendSeconds(30);
  };

  const handleRequestOtp =
    async (
      isResend = false,
    ) => {
      if (isRequestingOtp) {
        return;
      }

      Keyboard.dismiss();
      setError(null);
      setSuccess(null);

      if (!normalizedEmail) {
        setError(
          'Please enter your email address.',
        );
        return;
      }

      if (
        !emailPattern.test(
          normalizedEmail,
        )
      ) {
        setError(
          'Please enter a valid email address.',
        );
        return;
      }

      setIsRequestingOtp(true);

      try {
        const response =
          await authApi.requestClientOtp({
            email: normalizedEmail,
          });

        if (
          !isSuccessResponse(response)
        ) {
          throw new Error(
            getResponseMessage(
              response,
              'Unable to send OTP.',
            ),
          );
        }

        setStep('OTP');
        setOtp('');
        startResendTimer();

        setSuccess(
          isResend
            ? 'OTP resent successfully.'
            : 'OTP sent successfully. Please check your email.',
        );
      } catch (apiError: unknown) {
        const typedError =
          apiError as {
            response?: {
              data?: {
                message?: string;
              };
            };
            message?: string;
          };

        setError(
          typedError.response?.data
            ?.message ||
            typedError.message ||
            'Unable to send OTP.',
        );
      } finally {
        setIsRequestingOtp(false);
      }
    };

  const handleVerifyOtp =
    async () => {
      if (isVerifyingOtp) {
        return;
      }

      Keyboard.dismiss();
      setError(null);
      setSuccess(null);

      const normalizedOtp =
        otp.trim();

      if (!normalizedOtp) {
        setError(
          'Please enter the OTP.',
        );
        return;
      }

      setIsVerifyingOtp(true);

      try {
        const response =
          await authApi.verifyClientOtp({
            email: normalizedEmail,
            otp: normalizedOtp,
          });

        if (
          !isSuccessResponse(response)
        ) {
          throw new Error(
            getResponseMessage(
              response,
              'Invalid OTP.',
            ),
          );
        }

        setStep('RESET');
        setSuccess(
          'OTP verified successfully.',
        );
      } catch (apiError: unknown) {
        const typedError =
          apiError as {
            response?: {
              data?: {
                message?: string;
              };
            };
            message?: string;
          };

        setError(
          typedError.response?.data
            ?.message ||
            typedError.message ||
            'Unable to verify OTP.',
        );
      } finally {
        setIsVerifyingOtp(false);
      }
    };

  const handleResetPassword =
    async () => {
      if (isResettingPassword) {
        return;
      }

      Keyboard.dismiss();
      setError(null);
      setSuccess(null);

      if (!password.trim()) {
        setError(
          'Please enter your new password.',
        );
        return;
      }

      if (password.length < 6) {
        setError(
          'Password must be at least 6 characters.',
        );
        return;
      }

      if (
        password !== confirmPassword
      ) {
        setError(
          'Password and confirm password do not match.',
        );
        return;
      }

      setIsResettingPassword(true);

      try {
        const response =
          await authApi.updateClientPassword({
            email: normalizedEmail,
            password,
          });

        if (
          !isSuccessResponse(response)
        ) {
          throw new Error(
            getResponseMessage(
              response,
              'Unable to reset password.',
            ),
          );
        }

        setSuccess(
          'Password reset successfully. Please login with your new password.',
        );

        setTimeout(() => {
          navigation.goBack();
        }, 900);
      } catch (apiError: unknown) {
        const typedError =
          apiError as {
            response?: {
              data?: {
                message?: string;
              };
            };
            message?: string;
          };

        setError(
          typedError.response?.data
            ?.message ||
            typedError.message ||
            'Unable to reset password.',
        );
      } finally {
        setIsResettingPassword(false);
      }
    };

  return (
    <SafeAreaView
      style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={
          Colors.primary
        }
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }>
        <ScrollView
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={
            false
          }>
          <View
            style={styles.topSection}>
            <Pressable
              disabled={isBusy}
              onPress={() =>
                navigation.goBack()
              }
              style={({pressed}) => [
                styles.backButton,
                pressed &&
                  styles.pressed,
              ]}>
              <MaterialDesignIcons
                name="arrow-left"
                size={22}
                color={Colors.primary}
              />
            </Pressable>

            <View
              style={
                styles.logoContainer
              }>
              <MaterialDesignIcons
                name="lock-reset"
                size={38}
                color={Colors.primary}
              />
            </View>

            <Text
              style={styles.appName}>
              Forgot Password
            </Text>

            <Text
              style={styles.appTagline}>
              Verify your email and
              create a new password
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text
              style={styles.welcomeTitle}>
              {step === 'EMAIL'
                ? 'Reset your password'
                : step === 'OTP'
                  ? 'Verify OTP'
                  : 'Create new password'}
            </Text>

            <Text
              style={
                styles.welcomeSubtitle
              }>
              {step === 'EMAIL'
                ? 'Enter your registered email address to receive an OTP.'
                : step === 'OTP'
                  ? `OTP has been sent to ${normalizedEmail}.`
                  : 'Enter and confirm your new password.'}
            </Text>

            {error ? (
              <View
                style={
                  styles.errorContainer
                }>
                <MaterialDesignIcons
                  name="alert-circle-outline"
                  size={20}
                  color={Colors.danger}
                />

                <Text
                  style={
                    styles.errorText
                  }>
                  {error}
                </Text>
              </View>
            ) : null}

            {success ? (
              <View
                style={
                  styles.successContainer
                }>
                <MaterialDesignIcons
                  name="check-circle-outline"
                  size={20}
                  color={Colors.success}
                />

                <Text
                  style={
                    styles.successText
                  }>
                  {success}
                </Text>
              </View>
            ) : null}

            {step === 'EMAIL' ? (
              <>
                <Text
                  style={
                    styles.inputLabel
                  }>
                  Email address
                </Text>

                <View
                  style={
                    styles.inputContainer
                  }>
                  <MaterialDesignIcons
                    name="email-outline"
                    size={21}
                    color={
                      Colors.textMuted
                    }
                  />

                  <TextInput
                    value={email}
                    onChangeText={
                      setEmail
                    }
                    placeholder="Enter your registered email"
                    placeholderTextColor={
                      Colors.textMuted
                    }
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={() =>
                      handleRequestOtp(
                        false,
                      )
                    }
                    editable={
                      !isRequestingOtp
                    }
                    style={styles.input}
                  />
                </View>

                <Pressable
                  disabled={
                    isRequestingOtp
                  }
                  onPress={() =>
                    handleRequestOtp(
                      false,
                    )
                  }
                  style={({pressed}) => [
                    styles.primaryButton,
                    pressed &&
                      !isRequestingOtp &&
                      styles.pressed,
                    isRequestingOtp &&
                      styles.buttonDisabled,
                  ]}>
                  {isRequestingOtp ? (
                    <>
                      <ActivityIndicator
                        size="small"
                        color={
                          Colors.white
                        }
                      />

                      <Text
                        style={
                          styles.primaryButtonText
                        }>
                        Sending OTP...
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text
                        style={
                          styles.primaryButtonText
                        }>
                        Send OTP
                      </Text>

                      <MaterialDesignIcons
                        name="send"
                        size={20}
                        color={
                          Colors.white
                        }
                      />
                    </>
                  )}
                </Pressable>
              </>
            ) : null}

            {step === 'OTP' ? (
              <>
                <Text
                  style={
                    styles.inputLabel
                  }>
                  OTP
                </Text>

                <View
                  style={
                    styles.inputContainer
                  }>
                  <MaterialDesignIcons
                    name="shield-key-outline"
                    size={21}
                    color={
                      Colors.textMuted
                    }
                  />

                  <TextInput
                    value={otp}
                    onChangeText={setOtp}
                    placeholder="Enter OTP"
                    placeholderTextColor={
                      Colors.textMuted
                    }
                    keyboardType="number-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={
                      handleVerifyOtp
                    }
                    editable={
                      !isVerifyingOtp
                    }
                    style={styles.input}
                  />
                </View>

                <Pressable
                  disabled={
                    isVerifyingOtp
                  }
                  onPress={
                    handleVerifyOtp
                  }
                  style={({pressed}) => [
                    styles.primaryButton,
                    pressed &&
                      !isVerifyingOtp &&
                      styles.pressed,
                    isVerifyingOtp &&
                      styles.buttonDisabled,
                  ]}>
                  {isVerifyingOtp ? (
                    <>
                      <ActivityIndicator
                        size="small"
                        color={
                          Colors.white
                        }
                      />

                      <Text
                        style={
                          styles.primaryButtonText
                        }>
                        Verifying...
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text
                        style={
                          styles.primaryButtonText
                        }>
                        Verify OTP
                      </Text>

                      <MaterialDesignIcons
                        name="check"
                        size={21}
                        color={
                          Colors.white
                        }
                      />
                    </>
                  )}
                </Pressable>

                <Pressable
                  disabled={
                    resendSeconds > 0 ||
                    isRequestingOtp
                  }
                  onPress={() =>
                    handleRequestOtp(
                      true,
                    )
                  }
                  style={({pressed}) => [
                    styles.resendButton,
                    pressed &&
                      resendSeconds <=
                        0 &&
                      !isRequestingOtp &&
                      styles.pressed,
                  ]}>
                  <Text
                    style={[
                      styles.resendText,
                      (resendSeconds >
                        0 ||
                        isRequestingOtp) &&
                        styles.resendTextDisabled,
                    ]}>
                    {resendSeconds > 0
                      ? `Resend OTP in ${resendSeconds}s`
                      : 'Resend OTP'}
                  </Text>
                </Pressable>
              </>
            ) : null}

            {step === 'RESET' ? (
              <>
                <Text
                  style={
                    styles.inputLabel
                  }>
                  New password
                </Text>

                <View
                  style={
                    styles.inputContainer
                  }>
                  <MaterialDesignIcons
                    name="lock-outline"
                    size={21}
                    color={
                      Colors.textMuted
                    }
                  />

                  <TextInput
                    value={password}
                    onChangeText={
                      setPassword
                    }
                    placeholder="Enter new password"
                    placeholderTextColor={
                      Colors.textMuted
                    }
                    secureTextEntry={
                      !showPassword
                    }
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                  />

                  <Pressable
                    hitSlop={10}
                    onPress={() =>
                      setShowPassword(
                        current =>
                          !current,
                      )
                    }>
                    <MaterialDesignIcons
                      name={
                        showPassword
                          ? 'eye-off-outline'
                          : 'eye-outline'
                      }
                      size={22}
                      color={
                        Colors.textSecondary
                      }
                    />
                  </Pressable>
                </View>

                <Text
                  style={
                    styles.inputLabel
                  }>
                  Confirm password
                </Text>

                <View
                  style={
                    styles.inputContainer
                  }>
                  <MaterialDesignIcons
                    name="lock-check-outline"
                    size={21}
                    color={
                      Colors.textMuted
                    }
                  />

                  <TextInput
                    value={
                      confirmPassword
                    }
                    onChangeText={
                      setConfirmPassword
                    }
                    placeholder="Confirm new password"
                    placeholderTextColor={
                      Colors.textMuted
                    }
                    secureTextEntry={
                      !showConfirmPassword
                    }
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={
                      handleResetPassword
                    }
                    style={styles.input}
                  />

                  <Pressable
                    hitSlop={10}
                    onPress={() =>
                      setShowConfirmPassword(
                        current =>
                          !current,
                      )
                    }>
                    <MaterialDesignIcons
                      name={
                        showConfirmPassword
                          ? 'eye-off-outline'
                          : 'eye-outline'
                      }
                      size={22}
                      color={
                        Colors.textSecondary
                      }
                    />
                  </Pressable>
                </View>

                <Pressable
                  disabled={
                    isResettingPassword
                  }
                  onPress={
                    handleResetPassword
                  }
                  style={({pressed}) => [
                    styles.primaryButton,
                    pressed &&
                      !isResettingPassword &&
                      styles.pressed,
                    isResettingPassword &&
                      styles.buttonDisabled,
                  ]}>
                  {isResettingPassword ? (
                    <>
                      <ActivityIndicator
                        size="small"
                        color={
                          Colors.white
                        }
                      />

                      <Text
                        style={
                          styles.primaryButtonText
                        }>
                        Updating...
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text
                        style={
                          styles.primaryButtonText
                        }>
                        Reset Password
                      </Text>

                      <MaterialDesignIcons
                        name="lock-reset"
                        size={21}
                        color={
                          Colors.white
                        }
                      />
                    </>
                  )}
                </Pressable>
              </>
            ) : null}

            <Pressable
              disabled={isBusy}
              onPress={() =>
                navigation.goBack()
              }
              style={({pressed}) => [
                styles.loginLink,
                pressed &&
                  styles.pressed,
              ]}>
              <Text
                style={
                  styles.loginLinkText
                }>
                Back to Login
              </Text>
            </Pressable>
          </View>

          <Text
            style={styles.footerText}>
            Nirnayan Health Care Private Limited.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        Colors.primary,
    },

    keyboardView: {
      flex: 1,
    },

    scrollContent: {
      flexGrow: 1,
      backgroundColor:
        Colors.background,
    },

    topSection: {
      paddingHorizontal: 24,
      paddingTop: 28,
      paddingBottom: 58,
      alignItems: 'center',
      backgroundColor:
        Colors.primary,
      borderBottomLeftRadius: 34,
      borderBottomRightRadius: 34,
    },

    backButton: {
      position: 'absolute',
      left: 18,
      top: 28,
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        Colors.white,
    },

    logoContainer: {
      width: 76,
      height: 76,
      marginTop: 10,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        Colors.white,
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
      color:
        'rgba(255,255,255,0.78)',
      fontSize: 13,
      lineHeight: 19,
    },

    formCard: {
      marginHorizontal: 18,
      marginTop: -34,
      padding: 22,
      borderRadius: 24,
      backgroundColor:
        Colors.surface,
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
      color:
        Colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
    },

    errorContainer: {
      marginBottom: 18,
      padding: 12,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        Colors.dangerLight,
    },

    errorText: {
      flex: 1,
      marginLeft: 9,
      color: Colors.danger,
      fontSize: 12,
      lineHeight: 17,
    },

    successContainer: {
      marginBottom: 18,
      padding: 12,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        Colors.successLight,
    },

    successText: {
      flex: 1,
      marginLeft: 9,
      color: Colors.success,
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
      backgroundColor:
        Colors.surfaceSecondary,
    },

    input: {
      flex: 1,
      marginLeft: 10,
      paddingVertical: 12,
      color: Colors.textPrimary,
      fontSize: 14,
    },

    primaryButton: {
      minHeight: 55,
      marginTop: 5,
      borderRadius: 15,
      paddingHorizontal: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      columnGap: 9,
      backgroundColor:
        Colors.primary,
    },

    primaryButtonText: {
      color: Colors.white,
      fontSize: 15,
      fontWeight: '700',
    },

    buttonDisabled: {
      opacity: 0.65,
    },

    resendButton: {
      marginTop: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },

    resendText: {
      color: Colors.primary,
      fontSize: 13,
      fontWeight: '700',
    },

    resendTextDisabled: {
      color: Colors.textMuted,
    },

    loginLink: {
      marginTop: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },

    loginLinkText: {
      color: Colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },

    footerText: {
      marginTop: 26,
      marginBottom: 24,
      textAlign: 'center',
      color: Colors.textMuted,
      fontSize: 12,
    },

    pressed: {
      opacity: 0.82,
    },
  });