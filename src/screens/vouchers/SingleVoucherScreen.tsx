import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  MaterialDesignIcons,
} from '@react-native-vector-icons/material-design-icons/static';

import {useNavigation} from '@react-navigation/native';

import {Colors} from '../../constants/colors';
import {expenseApi} from '../../api/expense.api';
import {useAuthStore} from '../../store/authStore';
import {useCenterStore} from '../../store/centerStore';
import {useVoucherStore} from '../../store/voucherStore';
import {useAppAlertStore} from '../../store/appAlertStore';

const getCurrentDate = (): string => {
  const date = new Date();

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0');

  const day = String(
    date.getDate(),
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export default function SingleVoucherScreen() {
  const navigation = useNavigation();

  const session = useAuthStore(
    state => state.session,
  );

  const selectedCenterId = useCenterStore(
    state => state.selectedCenterId,
  );

  const {
    categories,
    isCategoryLoading,
    categoryError,
    loadCategories,
  } = useVoucherStore();

  const showSuccess = useAppAlertStore(
    state => state.showSuccess,
  );

  const showError = useAppAlertStore(
    state => state.showError,
  );

  const [categoryId, setCategoryId] =
    useState<number | null>(null);

  const [categoryName, setCategoryName] =
    useState('');

  const [beneficiaryName, setBeneficiaryName] =
    useState('');

  const [amount, setAmount] =
    useState('');

  const [narration, setNarration] =
    useState('');

  const [categoryModalVisible, setCategoryModalVisible] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errors, setErrors] = useState({
    category: '',
    beneficiaryName: '',
    amount: '',
    narration: '',
  });

  const employeeId = Number(
    session?.employee?.id || 0,
  );

  const centreId = Number(
    selectedCenterId ||
      session?.centreId ||
      0,
  );

  useEffect(() => {
    if (centreId > 0) {
      void loadCategories(centreId);
    }
  }, [centreId, loadCategories]);

  const numericAmount = useMemo(() => {
    return Number(amount);
  }, [amount]);

  const clearError = (
    field: keyof typeof errors,
  ) => {
    setErrors(previous => ({
      ...previous,
      [field]: '',
    }));
  };

  const validateForm = (): boolean => {
    const newErrors = {
      category: '',
      beneficiaryName: '',
      amount: '',
      narration: '',
    };

    let isValid = true;

    if (!categoryId) {
      newErrors.category =
        'Please select an expense category.';
      isValid = false;
    }

    if (!beneficiaryName.trim()) {
      newErrors.beneficiaryName =
        'Beneficiary name is required.';
      isValid = false;
    }

    if (!amount.trim()) {
      newErrors.amount =
        'Amount is required.';
      isValid = false;
    } else if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      newErrors.amount =
        'Enter a valid amount greater than zero.';
      isValid = false;
    }

    if (!narration.trim()) {
      newErrors.narration =
        'Narration is required.';
      isValid = false;
    }

    if (employeeId <= 0) {
      showError(
        'Employee unavailable',
        'Please log in again and try creating the voucher.',
      );

      isValid = false;
    }

    if (centreId <= 0) {
      showError(
        'Centre unavailable',
        'Please select a centre before creating the voucher.',
      );

      isValid = false;
    }

    setErrors(newErrors);

    return isValid;
  };

  const handleSubmit = async () => {
    if (
      isSubmitting ||
      !validateForm()
    ) {
      return;
    }

    const payload = [
      {
        user_id: employeeId,
        center_id: centreId,
        expense_date: getCurrentDate(),
        category_id: categoryId,
        sub_expense_id: null,

        beneficiary_code: null,
        beneficiary_name:
          beneficiaryName.trim(),

        expense_type: 1,

        gross_amount: numericAmount,
        net_payable: numericAmount,

        remarks: narration.trim(),

        payment_type: 3,
        payment_mode: 'BANK',

        transaction_ref: '',
        status: 'CREATED',
      },
    ];

    try {
      setIsSubmitting(true);

      console.log(
        'SINGLE VOUCHER PAYLOAD:',
        JSON.stringify(payload, null, 2),
      );
    //   return
      const response =
        await expenseApi.createBulkExpense(
          payload,
        );

      console.log(
        'SINGLE VOUCHER RESPONSE:',
        JSON.stringify(response, null, 2),
      );

      const failedCount = Number(
        response?.failedCount ??
          response?.data?.failedCount ??
          0,
      );

      const isSuccessful =
        (
          response?.status === 1 ||
          response?.status === true ||
          response?.success === true
        ) &&
        failedCount === 0;

        if (!isSuccessful) {
        const failedMessage =
            response?.failedData?.[0]?.error ||
            response?.data?.failedData?.[0]?.error ||
            response?.failed?.[0]?.message ||
            response?.data?.failed?.[0]?.message ||
            response?.message ||
            'Unable to create payment voucher.';

        showError(
            'Unable to create voucher',
            failedMessage,
        );

        return;
        }

      showSuccess(
        'Voucher created',
        response?.message ||
          'The payment voucher was created successfully.',
        () => {
          navigation.goBack();
        },
      );
    }  catch (error: any) {
        console.error(
            'Single voucher creation failed:',
            {
            status: error?.response?.status,
            response: error?.response?.data,
            message: error?.message,
            },
        );

        const apiResponse =
            error?.response?.data;

        const errorMessage =
            apiResponse?.failedData?.[0]?.error ||
            apiResponse?.data?.failedData?.[0]?.error ||
            error?.failedData?.[0]?.error ||
            error?.data?.failedData?.[0]?.error ||
            error?.message ||
            apiResponse?.message ||
            'Please try again.';

        showError(
            'Unable to create voucher',
            errorMessage,
        );
        } finally {
        setIsSubmitting(false);
        }
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.introCard}>
            <View style={styles.introIcon}>
              <MaterialDesignIcons
                name="file-document-edit-outline"
                size={30}
                color={Colors.primary}
              />
            </View>

            <View style={styles.introContent}>
              <Text style={styles.introTitle}>
                Single payment voucher
              </Text>

              <Text style={styles.introText}>
                Enter the payment information to create one voucher.
              </Text>
            </View>
          </View>

          <Text style={styles.label}>
            Expense category
            <Text style={styles.required}> *</Text>
          </Text>

          <Pressable
            style={[
              styles.selector,
              errors.category
                ? styles.inputError
                : undefined,
            ]}
            onPress={() =>
              setCategoryModalVisible(true)
            }>
            <MaterialDesignIcons
              name="shape-outline"
              size={22}
              color={Colors.primary}
            />

            <Text
              style={[
                styles.selectorText,
                !categoryName &&
                  styles.placeholder,
              ]}
              numberOfLines={1}>
              {categoryName ||
                'Select expense category'}
            </Text>

            {isCategoryLoading ? (
              <ActivityIndicator
                size="small"
                color={Colors.primary}
              />
            ) : (
              <MaterialDesignIcons
                name="chevron-down"
                size={24}
                color={Colors.textMuted}
              />
            )}
          </Pressable>

          {errors.category ? (
            <Text style={styles.errorText}>
              {errors.category}
            </Text>
          ) : null}

          {categoryError ? (
            <Text style={styles.errorText}>
              {categoryError}
            </Text>
          ) : null}

          <Text style={styles.label}>
            Beneficiary name
            <Text style={styles.required}> *</Text>
          </Text>

          <TextInput
            value={beneficiaryName}
            onChangeText={value => {
              setBeneficiaryName(value);
              clearError('beneficiaryName');
            }}
            placeholder="Enter beneficiary name"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="words"
            style={[
              styles.input,
              errors.beneficiaryName
                ? styles.inputError
                : undefined,
            ]}
          />

          {errors.beneficiaryName ? (
            <Text style={styles.errorText}>
              {errors.beneficiaryName}
            </Text>
          ) : null}

          <Text style={styles.label}>
            Amount
            <Text style={styles.required}> *</Text>
          </Text>

          <View
            style={[
              styles.amountContainer,
              errors.amount
                ? styles.inputError
                : undefined,
            ]}>
            <Text style={styles.currency}>
              ₹
            </Text>

            <TextInput
              value={amount}
              onChangeText={value => {
                const cleanedValue =
                  value.replace(
                    /[^0-9.]/g,
                    '',
                  );

                const parts =
                  cleanedValue.split('.');

                const formattedValue =
                  parts.length > 2
                    ? `${parts[0]}.${parts
                        .slice(1)
                        .join('')}`
                    : cleanedValue;

                setAmount(formattedValue);
                clearError('amount');
              }}
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              style={styles.amountInput}
            />
          </View>

          {errors.amount ? (
            <Text style={styles.errorText}>
              {errors.amount}
            </Text>
          ) : null}

          <Text style={styles.label}>
            Narration
            <Text style={styles.required}> *</Text>
          </Text>

          <TextInput
            value={narration}
            onChangeText={value => {
              setNarration(value);
              clearError('narration');
            }}
            placeholder="Enter payment purpose or narration"
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={500}
            textAlignVertical="top"
            style={[
              styles.input,
              styles.narrationInput,
              errors.narration
                ? styles.inputError
                : undefined,
            ]}
          />

          <Text style={styles.characterCount}>
            {narration.length}/500
          </Text>

          {errors.narration ? (
            <Text style={styles.errorText}>
              {errors.narration}
            </Text>
          ) : null}

          <Pressable
            disabled={isSubmitting}
            style={({pressed}) => [
              styles.submitButton,
              isSubmitting &&
                styles.submitDisabled,
              pressed &&
                !isSubmitting &&
                styles.pressed,
            ]}
            onPress={handleSubmit}>
            {isSubmitting ? (
              <ActivityIndicator
                size="small"
                color={Colors.white}
              />
            ) : (
              <>
                <MaterialDesignIcons
                  name="check-circle-outline"
                  size={22}
                  color={Colors.white}
                />

                <Text style={styles.submitText}>
                  Create Voucher
                </Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setCategoryModalVisible(false)
        }>
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() =>
              setCategoryModalVisible(false)
            }
          />

          <View style={styles.categoryModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select Expense Category
              </Text>

              <Pressable
                onPress={() =>
                  setCategoryModalVisible(false)
                }>
                <MaterialDesignIcons
                  name="close"
                  size={24}
                  color={Colors.textSecondary}
                />
              </Pressable>
            </View>

            {isCategoryLoading ? (
              <ActivityIndicator
                style={styles.categoryLoader}
                size="large"
                color={Colors.primary}
              />
            ) : (
              <FlatList
                data={categories}
                keyExtractor={item =>
                  String(item.id)
                }
                renderItem={({item}) => (
                  <Pressable
                    style={styles.categoryItem}
                    onPress={() => {
                      setCategoryId(item.id);

                      setCategoryName(
                        item.category_name,
                      );

                      clearError('category');

                      setCategoryModalVisible(
                        false,
                      );
                    }}>
                    <Text
                      style={
                        styles.categoryName
                      }>
                      {item.category_name}
                    </Text>

                    {categoryId ===
                    item.id ? (
                      <MaterialDesignIcons
                        name="check-circle"
                        size={22}
                        color={Colors.primary}
                      />
                    ) : null}
                  </Pressable>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>
                    No expense categories available.
                  </Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  content: {
    padding: 16,
    paddingBottom: 30,
  },

  introCard: {
    padding: 16,
    marginBottom: 22,
    borderRadius: 16,
    flexDirection: 'row',
    backgroundColor: Colors.primaryLight,
  },

  introIcon: {
    width: 52,
    height: 52,
    marginRight: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },

  introContent: {
    flex: 1,
  },

  introTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  introText: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
  },

  label: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  required: {
    color: Colors.danger,
  },

  input: {
    minHeight: 52,
    paddingHorizontal: 15,
    marginBottom: 5,
    borderWidth: 1,
    borderRadius: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },

  selector: {
    minHeight: 54,
    paddingHorizontal: 14,
    marginBottom: 5,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },

  selectorText: {
    flex: 1,
    marginHorizontal: 11,
    fontSize: 14,
    color: Colors.textPrimary,
  },

  placeholder: {
    color: Colors.textMuted,
  },

  amountContainer: {
    minHeight: 52,
    paddingHorizontal: 15,
    marginBottom: 5,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },

  currency: {
    marginRight: 8,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  amountInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 15,
    color: Colors.textPrimary,
  },

  narrationInput: {
    minHeight: 110,
    paddingTop: 14,
  },

  inputError: {
    borderColor: Colors.danger,
  },

  errorText: {
    marginBottom: 12,
    fontSize: 12,
    color: Colors.danger,
  },

  characterCount: {
    marginBottom: 5,
    textAlign: 'right',
    fontSize: 11,
    color: Colors.textMuted,
  },

  submitButton: {
    minHeight: 54,
    marginTop: 17,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },

  submitDisabled: {
    opacity: 0.65,
  },

  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },

  pressed: {
    opacity: 0.75,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(16,24,40,0.5)',
  },

  categoryModal: {
    maxHeight: '70%',
    padding: 18,
    paddingBottom: 30,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: Colors.surface,
  },

  modalHeader: {
    paddingBottom: 15,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomColor: Colors.border,
  },

  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  categoryLoader: {
    marginVertical: 40,
  },

  categoryItem: {
    minHeight: 54,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomColor: Colors.border,
  },

  categoryName: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
  },

  emptyText: {
    paddingVertical: 35,
    textAlign: 'center',
    color: Colors.textSecondary,
  },
});