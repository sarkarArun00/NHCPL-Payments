import React from 'react';
import {
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

type VoucherTypeModalProps = {
  visible: boolean;
  onClose: () => void;
  onSinglePress: () => void;
  onBulkPress: () => void;
};

export default function VoucherTypeModal({
  visible,
  onClose,
  onSinglePress,
  onBulkPress,
}: VoucherTypeModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />

        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>
                Create Payment Voucher
              </Text>

              <Text style={styles.subtitle}>
                Select how you want to create the voucher
              </Text>
            </View>

            <Pressable
              style={styles.closeButton}
              onPress={onClose}>
              <MaterialDesignIcons
                name="close"
                size={22}
                color={Colors.textSecondary}
              />
            </Pressable>
          </View>

          <Pressable
            style={({pressed}) => [
              styles.option,
              pressed && styles.pressed,
            ]}
            onPress={onSinglePress}>
            <View style={styles.singleIcon}>
              <MaterialDesignIcons
                name="file-document-edit-outline"
                size={28}
                color={Colors.primary}
              />
            </View>

            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>
                Single Voucher
              </Text>

              <Text style={styles.optionDescription}>
                Enter beneficiary name, amount and narration
              </Text>
            </View>

            <MaterialDesignIcons
              name="chevron-right"
              size={26}
              color={Colors.textMuted}
            />
          </Pressable>

          <Pressable
            style={({pressed}) => [
              styles.option,
              pressed && styles.pressed,
            ]}
            onPress={onBulkPress}>
            <View style={styles.bulkIcon}>
              <MaterialDesignIcons
                name="file-excel-outline"
                size={28}
                color={Colors.info}
              />
            </View>

            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>
                Bulk Voucher
              </Text>

              <Text style={styles.optionDescription}>
                Upload an XLS or XLSX file containing multiple vouchers
              </Text>
            </View>

            <MaterialDesignIcons
              name="chevron-right"
              size={26}
              color={Colors.textMuted}
            />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 24, 40, 0.55)',
  },

  modalContainer: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: Colors.surface,
  },

  header: {
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  title: {
    fontSize: 19,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  subtitle: {
    marginTop: 5,
    fontSize: 13,
    color: Colors.textSecondary,
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceSecondary,
  },

  option: {
    minHeight: 86,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },

  singleIcon: {
    width: 52,
    height: 52,
    marginRight: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },

  bulkIcon: {
    width: 52,
    height: 52,
    marginRight: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.infoLight,
  },

  optionContent: {
    flex: 1,
  },

  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  optionDescription: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
  },

  pressed: {
    opacity: 0.7,
  },
});