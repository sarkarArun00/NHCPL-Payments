import React, {
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  MaterialDesignIcons,
} from '@react-native-vector-icons/material-design-icons/static';

import {Colors} from '../constants/colors';
import {useAppAlertStore} from '../store/appAlertStore';
import {
  AppAlertButton,
  AppAlertType,
} from '../types/appAlert.types';

type AlertVisualConfig = {
  icon: string;
  color: string;
  backgroundColor: string;
};

const getAlertVisualConfig = (
  type: AppAlertType,
): AlertVisualConfig => {
  switch (type) {
    case 'success':
      return {
        icon: 'check-circle-outline',
        color: Colors.success,
        backgroundColor:
          Colors.successLight,
      };

    case 'error':
      return {
        icon: 'alert-circle-outline',
        color: Colors.danger,
        backgroundColor:
          Colors.dangerLight,
      };

    case 'warning':
      return {
        icon: 'alert-outline',
        color: Colors.warning,
        backgroundColor:
          Colors.warningLight,
      };

    case 'confirm':
      return {
        icon: 'help-circle-outline',
        color: Colors.primary,
        backgroundColor:
          Colors.primaryLight,
      };

    default:
      return {
        icon: 'information-outline',
        color: Colors.info,
        backgroundColor:
          Colors.infoLight,
      };
  }
};

export default function AppAlertModal() {
  const {
    visible,
    type,
    title,
    message,
    buttons,
    dismissible,
    hideAlert,
  } = useAppAlertStore();

  const [
    activeButtonIndex,
    setActiveButtonIndex,
  ] = useState<number | null>(null);

  const visualConfig = useMemo(
    () => getAlertVisualConfig(type),
    [type],
  );

  const handleButtonPress = async (
    button: AppAlertButton,
    index: number,
  ) => {
    if (activeButtonIndex !== null) {
      return;
    }

    try {
      setActiveButtonIndex(index);

      if (button.onPress) {
        await button.onPress();
      }

      hideAlert();
    } catch (error) {
      console.error(
        'Alert action failed:',
        error,
      );

      hideAlert();
    } finally {
      setActiveButtonIndex(null);
    }
  };

  const handleBackdropPress = () => {
    if (
      dismissible &&
      activeButtonIndex === null
    ) {
      hideAlert();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={
        dismissible
          ? hideAlert
          : undefined
      }>
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleBackdropPress}
        />

        <View style={styles.alertCard}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor:
                  visualConfig.backgroundColor,
              },
            ]}>
            <MaterialDesignIcons
              name={visualConfig.icon as any}
              size={34}
              color={visualConfig.color}
            />
          </View>

          <Text style={styles.title}>
            {title}
          </Text>

          {message ? (
            <Text style={styles.message}>
              {message}
            </Text>
          ) : null}

          <View
            style={[
              styles.actions,

              buttons.length === 1 &&
                styles.singleAction,
            ]}>
            {buttons.map(
              (button, index) => {
                const isLoading =
                  activeButtonIndex ===
                  index;

                const isDisabled =
                  activeButtonIndex !==
                  null;

                const buttonStyle =
                  getButtonStyle(
                    button.style,
                  );

                return (
                  <Pressable
                    key={`${button.text}-${index}`}
                    disabled={isDisabled}
                    onPress={() =>
                      handleButtonPress(
                        button,
                        index,
                      )
                    }
                    style={({pressed}) => [
                      styles.button,
                      buttonStyle.container,

                      pressed &&
                        !isDisabled &&
                        styles.pressed,

                      isDisabled &&
                        !isLoading &&
                        styles.disabledButton,
                    ]}>
                    {isLoading ? (
                      <ActivityIndicator
                        size="small"
                        color={
                          buttonStyle
                            .text.color
                        }
                      />
                    ) : (
                      <Text
                        style={[
                          styles.buttonText,
                          buttonStyle.text,
                        ]}>
                        {button.text}
                      </Text>
                    )}
                  </Pressable>
                );
              },
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const getButtonStyle = (
  style:
    | AppAlertButton['style']
    | undefined,
) => {
  switch (style) {
    case 'cancel':
      return {
        container: styles.cancelButton,
        text: styles.cancelButtonText,
      };

    case 'destructive':
      return {
        container:
          styles.destructiveButton,
        text:
          styles.primaryButtonText,
      };

    case 'success':
      return {
        container:
          styles.successButton,
        text:
          styles.primaryButtonText,
      };

    default:
      return {
        container:
          styles.primaryButton,
        text:
          styles.primaryButtonText,
      };
  }
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      'rgba(15, 23, 42, 0.58)',
  },

  alertCard: {
    width: '100%',
    maxWidth: 390,
    paddingHorizontal: 22,
    paddingTop: 25,
    paddingBottom: 20,
    borderRadius: 24,
    alignItems: 'center',
    backgroundColor: Colors.surface,

    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 14,
    },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 14,
  },

  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    marginTop: 18,
    paddingHorizontal: 8,
    color: Colors.textPrimary,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '800',
    textAlign: 'center',
  },

  message: {
    marginTop: 9,
    paddingHorizontal: 4,
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },

  actions: {
    width: '100%',
    marginTop: 24,
    flexDirection: 'row',
    columnGap: 10,
  },

  singleAction: {
    justifyContent: 'center',
  },

  button: {
    flex: 1,
    minHeight: 49,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonText: {
    fontSize: 13,
    fontWeight: '800',
  },

  primaryButton: {
    backgroundColor: Colors.primary,
  },

  successButton: {
    backgroundColor: Colors.success,
  },

  destructiveButton: {
    backgroundColor: Colors.danger,
  },

  cancelButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor:
      Colors.surfaceSecondary,
  },

  primaryButtonText: {
    color: Colors.white,
  },

  cancelButtonText: {
    color: Colors.textPrimary,
  },

  pressed: {
    opacity: 0.82,
    transform: [
      {
        scale: 0.98,
      },
    ],
  },

  disabledButton: {
    opacity: 0.5,
  },
});