import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useFocusEffect } from "@react-navigation/native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons/static";

import { Colors } from "../../constants/colors";
import {
  expenseApi,
  PaymentChecklistItem,
  PaymentChecklistSummary,
} from '../../api/expense.api';
import { useAuthStore } from "../../store/authStore";
import { useCenterStore } from "../../store/centerStore";


type ChecklistStatus =
  | ""
  | "APPROVED"
  | "SETTLED"
  | "PROCESSING"
  | "REJECTED"
  | "FAILED"
  | "SUCCESS";

type ActiveDateField = "FROM" | "TO" | null;


type ChecklistFilter = {
  fromDate: string;
  toDate: string;
  categoryId: number | null;
  status: ChecklistStatus;
};

const STATUS_OPTIONS: Array<{
  label: string;
  value: ChecklistStatus;
}> = [
  { label: "Approved", value: "APPROVED" },
  { label: "Settled", value: "SETTLED" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Failed", value: "FAILED" },
  { label: "Success", value: "SUCCESS" },
];

const DEFAULT_FILTER: ChecklistFilter = {
  fromDate: '',
  toDate: '',
  categoryId: null,
  status: 'APPROVED',
};

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseLocalDate(value: string): Date {
  if (!value) {
    return new Date();
  }

  const [year, month, day] = value.split("-").map(Number);

  const parsedDate = new Date(year, month - 1, day);

  return Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
}

function formatCurrency(amount?: number | string): string {
  const numericAmount = Number(String(amount ?? 0).replace(/,/g, ""));

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(numericAmount) ? numericAmount : 0);
}

const formatDateTime = (
  value?: string | null,
): string => {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return 'Not available';
  }

  return date.toLocaleString(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  );
};

function getStatusConfig(status?: string) {
  switch (
    String(status ?? "")
      .trim()
      .toUpperCase()
  ) {
    case "APPROVED":
      return {
        label: "Approved",
        color: Colors.success,
        background: Colors.successLight,
      };

    case "SETTLED":
    case "SUCCESS":
      return {
        label:
          String(status).toUpperCase() === "SUCCESS" ? "Success" : "Settled",
        color: Colors.info,
        background: Colors.infoLight,
      };

    case "PROCESSING":
      return {
        label: "Processing",
        color: Colors.warning,
        background: Colors.warningLight,
      };

    case "REJECTED":
    case "FAILED":
      return {
        label:
          String(status).toUpperCase() === "FAILED" ? "Failed" : "Rejected",
        color: Colors.danger,
        background: Colors.dangerLight,
      };

    default:
      return {
        label: status || "Unknown",
        color: Colors.textSecondary,
        background: Colors.surfaceSecondary,
      };
  }
}

export default function ApprovalListScreen() {
  const insets = useSafeAreaInsets();
  const session = useAuthStore((state) => state.session);

  const selectedCenterId = useCenterStore((state) => state.selectedCenterId);

  const centreId = Number(selectedCenterId || session?.centreId || 0);

  const [records, setRecords] = useState<PaymentChecklistItem[]>([]);

const [summary, setSummary] =
  useState<PaymentChecklistSummary>({
    totalPayments: 0,
    pendingPayments: 0,
    failedPayments: 0,
    totalAmount: 0,
  });

  
  const [search, setSearch] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [payNowLoadingId, setPayNowLoadingId] = useState<number | null>(null);

  const [isFilterVisible, setIsFilterVisible] = useState(false);

  const [activeFilter, setActiveFilter] =
    useState<ChecklistFilter>(DEFAULT_FILTER);

  const [draftFilter, setDraftFilter] =
    useState<ChecklistFilter>(DEFAULT_FILTER);

  const [activeDateField, setActiveDateField] = useState<ActiveDateField>(null);

  const [
  checklistItems,
  setChecklistItems,
] = useState<PaymentChecklistItem[]>([]);

const [
  checklistSummary,
  setChecklistSummary,
] = useState<PaymentChecklistSummary>({
  totalPayments: 0,
  pendingPayments: 0,
  failedPayments: 0,
  totalAmount: 0,
});

const [
  isLoadingChecklist,
  setIsLoadingChecklist,
] = useState(false);

const [
  checklistError,
  setChecklistError,
] = useState('');
  
  type ChecklistCategoryOption = {
  id: number;
  name: string;
  code?: string;
};

const [
  categoryOptions,
  setCategoryOptions,
] = useState<
  ChecklistCategoryOption[]
>([]);

const [
  isCategoryLoading,
  setIsCategoryLoading,
] = useState(false);

const [
  categoryError,
  setCategoryError,
] = useState('');

const loadChecklist = useCallback(
  async (
    refresh = false,
    filterOverride?: ChecklistFilter,
  ) => {
    if (centreId <= 0) {
      setRecords([]);

      setSummary({
        totalPayments: 0,
        pendingPayments: 0,
        failedPayments: 0,
        totalAmount: 0,
      });

      setError(
        'Center information is unavailable.',
      );

      return;
    }

    const selectedFilter =
      filterOverride ?? activeFilter;

    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError('');

      const payload: {
        center_id: number;
        expense_category_id?: number;
        status?: string;
        fromDate?: string;
        toDate?: string;
      } = {
        center_id: centreId,
      };

      if (
        selectedFilter.categoryId &&
        selectedFilter.categoryId > 0
      ) {
        payload.expense_category_id =
          selectedFilter.categoryId;
      }

      if (selectedFilter.status) {
        payload.status =
          selectedFilter.status;
      }

      if (selectedFilter.fromDate) {
        payload.fromDate =
          selectedFilter.fromDate;
      }

      if (selectedFilter.toDate) {
        payload.toDate =
          selectedFilter.toDate;
      }

      console.log(
        'PAYMENT CHECKLIST PAYLOAD:',
        payload,
      );

      const response =
        await expenseApi.paymentChecklist(
          payload,
        );

      const isSuccess =
        Number(response?.status) === 1 ||
        response?.success === true;

      if (!isSuccess) {
        throw new Error(
          response?.message ||
            'Unable to load payment checklist.',
        );
      }

      const checklistData =
        Array.isArray(
          response?.records?.data,
        )
          ? response.records.data
          : [];

      const checklistSummary =
        response?.records?.summary;

      setRecords(checklistData);

      setSummary({
        totalPayments: Number(
          checklistSummary
            ?.totalPayments ?? 0,
        ),

        pendingPayments: Number(
          checklistSummary
            ?.pendingPayments ?? 0,
        ),

        failedPayments: Number(
          checklistSummary
            ?.failedPayments ?? 0,
        ),

        totalAmount: Number(
          checklistSummary
            ?.totalAmount ?? 0,
        ),
      });
    } catch (apiError: any) {
      console.error(
        'Unable to load payment checklist:',
        {
          status:
            apiError?.response?.status,

          response:
            apiError?.response?.data,

          message:
            apiError?.message,
        },
      );

      setRecords([]);

      setSummary({
        totalPayments: 0,
        pendingPayments: 0,
        failedPayments: 0,
        totalAmount: 0,
      });

      setError(
        apiError?.response?.data
          ?.message ||
          apiError?.message ||
          'Unable to load payment checklist.',
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  },
  [
    centreId,
    activeFilter,
  ],
);

  useFocusEffect(
    useCallback(() => {
      void loadChecklist(true);

      return undefined;
    }, [loadChecklist]),
  );

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return records;
    }

    return records.filter((item) =>
      [
        item.voucher_no,
        item.category_name,
        item.beneficiary_name,
        item.bank_name,
        item.account_number,
        item.ifsc_code,
        item.status,
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query),
      ),
    );
  }, [records, search]);

const loadExpenseCategories =
  useCallback(async () => {
    if (centreId <= 0) {
      setCategoryOptions([]);
      setCategoryError('');

      return;
    }

    try {
      setIsCategoryLoading(true);
      setCategoryError('');

      const response =
        await expenseApi
          .getExpenseCategoriesByCenter(
            centreId,
          );

      const normalizedCategories:
        ChecklistCategoryOption[] =
        response.map(category => ({
          id: Number(category.id),

          name: String(
            category.category_name,
          ).trim(),

          code: String(
            category.category_code ?? '',
          ).trim(),
        }));

      setCategoryOptions(
        normalizedCategories,
      );

      /*
       * Remove the selected category when
       * it does not belong to the newly
       * selected center.
       */
      setActiveFilter(
        currentFilter => {
          const categoryStillExists =
            currentFilter.categoryId ===
              null ||
            normalizedCategories.some(
              category =>
                category.id ===
                currentFilter.categoryId,
            );

          if (categoryStillExists) {
            return currentFilter;
          }

          return {
            ...currentFilter,
            categoryId: null,
          };
        },
      );

      setDraftFilter(
        currentFilter => {
          const categoryStillExists =
            currentFilter.categoryId ===
              null ||
            normalizedCategories.some(
              category =>
                category.id ===
                currentFilter.categoryId,
            );

          if (categoryStillExists) {
            return currentFilter;
          }

          return {
            ...currentFilter,
            categoryId: null,
          };
        },
      );
    } catch (error: any) {
      console.error(
        'Unable to load expense categories:',
        {
          status:
            error?.response?.status,

          response:
            error?.response?.data,

          message:
            error?.message,
        },
      );

      setCategoryOptions([]);

      setCategoryError(
        error?.response?.data
          ?.message ||
          error?.message ||
          'Unable to load expense categories.',
      );
    } finally {
      setIsCategoryLoading(false);
    }
  }, [
    centreId,
  ]);


  useEffect(() => {
  if (centreId <= 0) {
    return;
  }

  void loadExpenseCategories();
}, [
  centreId,
  loadExpenseCategories,
]);
  const hasActiveFilter =
    activeFilter.status !== "APPROVED" ||
    Boolean(
      activeFilter.fromDate || activeFilter.toDate || activeFilter.categoryId,
    );

  const openFilter = useCallback(() => {
    setDraftFilter(activeFilter);
    setActiveDateField(null);
    setIsFilterVisible(true);
  }, [activeFilter]);

  const closeFilter = useCallback(() => {
    setActiveDateField(null);
    setIsFilterVisible(false);
  }, []);

  const handleDateChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      const selectedField = activeDateField;

      if (Platform.OS === "android") {
        setActiveDateField(null);
      }

      if (event.type === "dismissed" || !selectedDate || !selectedField) {
        return;
      }

      const formattedDate = formatLocalDate(selectedDate);

      setDraftFilter((current) => ({
        ...current,
        [selectedField === "FROM" ? "fromDate" : "toDate"]: formattedDate,
      }));

      if (Platform.OS === "ios") {
        setActiveDateField(null);
      }
    },
    [activeDateField],
  );

  const applyFilter = useCallback(async () => {
    if (Boolean(draftFilter.fromDate) !== Boolean(draftFilter.toDate)) {
      Alert.alert(
        "Incomplete date range",
        "Select both From Date and To Date, or clear both dates.",
      );
      return;
    }

    if (
      draftFilter.fromDate &&
      draftFilter.toDate &&
      draftFilter.fromDate > draftFilter.toDate
    ) {
      Alert.alert(
        "Invalid date range",
        "To Date cannot be earlier than From Date.",
      );
      return;
    }

    const nextFilter = {
      ...draftFilter,
    };

    setActiveFilter(nextFilter);
    setIsFilterVisible(false);
    setActiveDateField(null);

    await loadChecklist(true, nextFilter);
  }, [draftFilter, loadChecklist]);

  const resetFilter = useCallback(async () => {
    setDraftFilter(DEFAULT_FILTER);
    setActiveFilter(DEFAULT_FILTER);
    setIsFilterVisible(false);
    setActiveDateField(null);

    await loadChecklist(true, DEFAULT_FILTER);
  }, [loadChecklist]);

  const handlePayNow = useCallback(
    (item: PaymentChecklistItem) => {
      const checklistId = Number(item.checklist_id ?? 0);

      if (checklistId <= 0) {
        Alert.alert("Payment unavailable", "Checklist ID is unavailable.");
        return;
      }

      Alert.alert(
        "Confirm payment",
        `Proceed with payment for ${item.voucher_no || "this voucher"}?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Pay Now",
            onPress: async () => {
              try {
                setPayNowLoadingId(checklistId);

                const response = await expenseApi.payNowExpense(checklistId);

                const isSuccess =
                  Number(response?.status) === 1 || response?.success === true;

                if (!isSuccess) {
                  throw new Error(
                    response?.message || "Unable to process payment.",
                  );
                }

                await loadChecklist(true);

                Alert.alert(
                  "Payment updated",
                  response?.message || "Payment status changed successfully.",
                );
              } catch (apiError: any) {
                console.error("Pay now failed:", {
                  status: apiError?.response?.status,
                  response: apiError?.response?.data,
                  message: apiError?.message,
                });

                Alert.alert(
                  "Payment failed",
                  apiError?.response?.data?.message ||
                    apiError?.message ||
                    "Something went wrong while processing the payment.",
                );
              } finally {
                setPayNowLoadingId(null);
              }
            },
          },
        ],
      );
    },
    [loadChecklist],
  );

  const renderChecklistItem = ({ item }: { item: PaymentChecklistItem }) => {
    const statusConfig = getStatusConfig(item.status);

    const isPaying = payNowLoadingId === Number(item.checklist_id);

    const canPay =
      String(item.status ?? "")
        .trim()
        .toUpperCase() === "APPROVED";

    return (
      <View style={styles.paymentCard}>
        <View style={styles.cardHeader}>
          <View style={styles.voucherIcon}>
            <MaterialDesignIcons
              name="receipt-text-check-outline"
              size={24}
              color={Colors.primary}
            />
          </View>

          <View style={styles.cardTitleArea}>
            <Text style={styles.voucherNumber} numberOfLines={1}>
              {item.voucher_no || `Checklist #${item.checklist_id}`}
            </Text>

            <Text style={styles.categoryName} numberOfLines={1}>
              {item.category_name || "Expense payment"}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: statusConfig.background,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: statusConfig.color,
                },
              ]}
            >
              {statusConfig.label}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.payeeAmountRow}>
          <View style={styles.payeeArea}>
            <Text style={styles.fieldLabel}>Payee name</Text>

            <Text style={styles.fieldValue} numberOfLines={1}>
              {item.beneficiary_name || "Not available"}
            </Text>
          </View>

          <View style={styles.amountArea}>
            <Text style={styles.fieldLabel}>Amount</Text>

            <Text style={styles.amountValue}>
              {formatCurrency(item.amount)}
            </Text>
          </View>
        </View>

        <View style={styles.bankCard}>
          <View style={styles.bankTitleRow}>
            <MaterialDesignIcons
              name="bank-outline"
              size={17}
              color={Colors.primary}
            />

            <Text style={styles.bankName} numberOfLines={1}>
              {item.bank_name || "Bank not available"}
            </Text>
          </View>

          <View style={styles.bankDetailsRow}>
            <View style={styles.bankDetailItem}>
              <Text style={styles.bankDetailLabel}>Account</Text>

              <Text style={styles.bankDetailValue} numberOfLines={1}>
                {item.account_number || "--"}
              </Text>
            </View>

            <View style={styles.bankDetailItem}>
              <Text style={styles.bankDetailLabel}>IFSC</Text>

              <Text style={styles.bankDetailValue} numberOfLines={1}>
                {item.ifsc_code || "--"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.dateGrid}>
          <DateMeta
            label="Approved on"
            value={formatDateTime(item.approved_on || item.voucher_created_on)}
          />

          <DateMeta
            label="Scheduled"
            value={formatDateTime(item.scheduled_on)}
          />

          {/* <DateMeta label="Executed" value={formatDateTime(item.executed_on)} /> */}
        </View>

        {canPay ? (
          <Pressable
            disabled={payNowLoadingId !== null}
            onPress={() => handlePayNow(item)}
            style={({ pressed }) => [
              styles.payNowButton,
              payNowLoadingId !== null && styles.disabledButton,
              pressed && payNowLoadingId === null && styles.pressed,
            ]}
          >
            {isPaying ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <MaterialDesignIcons
                name="cash-check"
                size={20}
                color={Colors.white}
              />
            )}

            <Text style={styles.payNowText}>
              {isPaying ? "Processing payment..." : "Pay Now"}
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  useFocusEffect(
  useCallback(() => {
    void loadChecklist(true);

    return undefined;
  }, [loadChecklist]),
);

  const listHeader = (
    <>
      <SafeAreaView style={styles.safeArea}>
      <View style={styles.screenHeader}>
        <View style={styles.headerTextArea}>
          <Text style={styles.title}>Payment Checklist</Text>

          <Text style={styles.subtitle}>
            Review final-approved vouchers and process payments
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <MaterialDesignIcons
            name="clipboard-check-outline"
            size={26}
            color={Colors.primary}
          />
        </View>
      </View>

    <View style={styles.summaryGrid}>
  <SummaryCard
    label="Total Vouchers"
    value={String(
      summary.totalPayments,
    )}
    icon="file-document-check-outline"
    color={Colors.primary}
    background={
      Colors.primaryLight
    }
  />

  <SummaryCard
    label="Pending Vouchers"
    value={String(
      summary.pendingPayments,
    )}
    icon="clock-outline"
    color={Colors.warning}
    background={
      Colors.warningLight
    }
  />

  <SummaryCard
    label="Failed Vouchers"
    value={String(
      summary.failedPayments,
    )}
    icon="alert-circle-outline"
    color={Colors.danger}
    background={
      Colors.dangerLight
    }
  />

  <SummaryCard
    label="Total Amount"
    value={formatCurrency(
      summary.totalAmount,
    )}
    icon="currency-inr"
    color={Colors.success}
    background={
      Colors.successLight
    }
    compactValue
  />
    </View>

      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <MaterialDesignIcons
            name="magnify"
            size={21}
            color={Colors.textMuted}
          />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search voucher, payee, bank or account"
            placeholderTextColor={Colors.textMuted}
            style={styles.searchInput}
          />

          {search ? (
            <Pressable hitSlop={8} onPress={() => setSearch("")}>
              <MaterialDesignIcons
                name="close-circle"
                size={20}
                color={Colors.textMuted}
              />
            </Pressable>
          ) : null}
        </View>

        <Pressable
          onPress={openFilter}
          style={({ pressed }) => [
            styles.filterButton,
            pressed && styles.pressed,
          ]}
        >
          <MaterialDesignIcons
            name="filter-variant"
            size={23}
            color={Colors.white}
          />

          {hasActiveFilter ? <View style={styles.filterActiveDot} /> : null}
        </Pressable>
      </View>

      <View style={styles.resultHeader}>
        <View>
          <Text style={styles.resultTitle}>Payment records</Text>

          <Text style={styles.resultCount}>
            {filteredRecords.length}{" "}
            {filteredRecords.length === 1 ? "record" : "records"}
          </Text>
        </View>

        <View style={styles.activeStatusPill}>
          <Text style={styles.activeStatusText}>
            {activeFilter.status || "All"}
          </Text>
        </View>
        </View>
        </SafeAreaView>
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      {isLoading && records.length === 0 ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />

          <Text style={styles.stateText}>Loading payment checklist...</Text>
        </View>
      ) : error && records.length === 0 ? (
        <View style={styles.stateContainer}>
          <View style={styles.stateIcon}>
            <MaterialDesignIcons
              name="alert-circle-outline"
              size={42}
              color={Colors.danger}
            />
          </View>

          <Text style={styles.stateTitle}>Unable to load checklist</Text>

          <Text style={styles.stateText}>{error}</Text>

          <Pressable
            onPress={() => loadChecklist(false)}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredRecords}
          keyExtractor={(item, index) => String(item.checklist_id || index)}
          renderItem={renderChecklistItem}
          ListHeaderComponent={listHeader}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadChecklist(true)}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.listContent,
            filteredRecords.length === 0 && styles.emptyListContent,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.stateIcon}>
                <MaterialDesignIcons
                  name="clipboard-text-search-outline"
                  size={42}
                  color={Colors.primary}
                />
              </View>

              <Text style={styles.stateTitle}>No payment records found</Text>

              <Text style={styles.stateText}>
                Try changing the checklist filters or search text.
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={isFilterVisible}
        transparent
        animationType="slide"
        onRequestClose={closeFilter}
      >
        <View style={styles.modalContainer}>
          <Pressable style={styles.modalBackdrop} onPress={closeFilter} />

        <View
          style={[
            styles.modalSheet,
            {
              paddingBottom: Math.max(insets.bottom + 14, 30),
            },
          ]}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.modalTitleArea}>
                <Text style={styles.modalTitle}>Filter checklist</Text>

                <Text style={styles.modalSubtitle}>
                  Filter payments by status, category and date
                </Text>
              </View>

              <Pressable
                hitSlop={10}
                onPress={closeFilter}
                style={styles.modalClose}
              >
                <MaterialDesignIcons
                  name="close"
                  size={22}
                  color={Colors.textPrimary}
                />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.filterLabel}>Status</Text>

              <View style={styles.statusGrid}>
                {STATUS_OPTIONS.map((option) => {
                  const isSelected = draftFilter.status === option.value;

                  return (
                    <Pressable
                      key={option.value}
                      onPress={() =>
                        setDraftFilter((current) => ({
                          ...current,
                          status: option.value,
                        }))
                      }
                      style={({ pressed }) => [
                        styles.statusChip,
                        isSelected && styles.statusChipSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusChipText,
                          isSelected && styles.statusChipTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.filterLabel}>Expense category</Text>

              <View style={styles.categoryGrid}>
                <Pressable
                  onPress={() =>
                    setDraftFilter((current) => ({
                      ...current,
                      categoryId: null,
                    }))
                  }
                  style={({ pressed }) => [
                    styles.categoryChip,
                    draftFilter.categoryId === null &&
                      styles.categoryChipSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      draftFilter.categoryId === null &&
                        styles.categoryChipTextSelected,
                    ]}
                  >
                    All categories
                  </Text>
                </Pressable>

                {categoryOptions.map((category) => {
                  const isSelected = draftFilter.categoryId === category.id;

                  return (
                    <Pressable
                      key={String(category.id)}
                      onPress={() =>
                        setDraftFilter((current) => ({
                          ...current,
                          categoryId: category.id,
                        }))
                      }
                      style={({ pressed }) => [
                        styles.categoryChip,
                        isSelected && styles.categoryChipSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          isSelected && styles.categoryChipTextSelected,
                        ]}
                      >
                        {category.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.dateLabelRow}>
                <Text style={styles.filterLabel}>Date range</Text>

                {draftFilter.fromDate || draftFilter.toDate ? (
                  <Pressable
                    onPress={() =>
                      setDraftFilter((current) => ({
                        ...current,
                        fromDate: "",
                        toDate: "",
                      }))
                    }
                  >
                    <Text style={styles.clearDateText}>Clear dates</Text>
                  </Pressable>
                ) : null}
              </View>

              <View style={styles.dateRow}>
                <DateInput
                  label="From date"
                  value={draftFilter.fromDate}
                  onPress={() => setActiveDateField("FROM")}
                />

                <DateInput
                  label="To date"
                  value={draftFilter.toDate}
                  onPress={() => setActiveDateField("TO")}
                />
              </View>

              {activeDateField ? (
                <DateTimePicker
                  value={
                    activeDateField === "FROM"
                      ? parseLocalDate(draftFilter.fromDate)
                      : parseLocalDate(draftFilter.toDate)
                  }
                  mode="date"
                  display={Platform.OS === "android" ? "calendar" : "inline"}
                  maximumDate={
                    activeDateField === "FROM" && draftFilter.toDate
                      ? parseLocalDate(draftFilter.toDate)
                      : undefined
                  }
                  minimumDate={
                    activeDateField === "TO" && draftFilter.fromDate
                      ? parseLocalDate(draftFilter.fromDate)
                      : undefined
                  }
                  onChange={handleDateChange}
                />
              ) : null}
            </ScrollView>

            <View style={styles.filterActionRow}>
              <Pressable
                onPress={resetFilter}
                style={({ pressed }) => [
                  styles.resetButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </Pressable>

              <Pressable
                onPress={applyFilter}
                style={({ pressed }) => [
                  styles.applyButton,
                  pressed && styles.pressed,
                ]}
              >
                <MaterialDesignIcons
                  name="filter-check-outline"
                  size={19}
                  color={Colors.white}
                />

                <Text style={styles.applyButtonText}>Apply Filter</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  color,
  background,
  compactValue = false,
}: {
  label: string;
  value: string;
  icon: string;
  color: string;
  background: string;
  compactValue?: boolean;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIcon, { backgroundColor: background }]}>
        <MaterialDesignIcons name={icon as any} size={21} color={color} />
      </View>

      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[
          styles.summaryValue,
          compactValue && styles.summaryValueCompact,
        ]}
      >
        {value}
      </Text>

      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function DateMeta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.dateMetaItem}>
      <Text style={styles.dateMetaLabel}>{label}</Text>

      <Text numberOfLines={2} style={styles.dateMetaValue}>
        {value}
      </Text>
    </View>
  );
}

function DateInput({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.dateColumn}>
      <Text style={styles.dateInputLabel}>{label}</Text>

      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.dateInput, pressed && styles.pressed]}
      >
        <MaterialDesignIcons
          name="calendar-month-outline"
          size={19}
          color={Colors.primary}
        />

        <Text
          numberOfLines={1}
          style={[styles.dateInputText, !value && styles.datePlaceholder]}
        >
          {value || "Select date"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 34,
  },

  emptyListContent: {
    flexGrow: 1,
  },

  pressed: {
    opacity: 0.8,
  },

  disabledButton: {
    opacity: 0.5,
  },

  screenHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  headerTextArea: {
    flex: 1,
    paddingRight: 12,
  },


  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primaryLight,
  },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
    marginBottom: 18,
  },

  summaryCard: {
    width: "48.5%",
    minHeight: 124,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 17,
    backgroundColor: Colors.surface,
  },

  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  summaryValue: {
    marginTop: 13,
    color: Colors.textPrimary,
    fontSize: 21,
    fontWeight: "800",
  },

  summaryValueCompact: {
    fontSize: 17,
  },

  summaryLabel: {
    marginTop: 4,
    color: Colors.textMuted,
    fontSize: 10,
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 10,
    marginBottom: 10,
  },

  searchContainer: {
    flex: 1,
    height: 48,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    flexDirection: "row",
    alignItems: "center",
  },

  searchInput: {
    flex: 1,
    marginLeft: 9,
    paddingVertical: 0,
    color: Colors.textPrimary,
    fontSize: 13,
  },

  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
  },

  filterActiveDot: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.warning,
  },

  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 0,
  },

  resultTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },

  resultCount: {
    marginTop: 3,
    color: Colors.textMuted,
    fontSize: 12,
  },

  activeStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
  },

  activeStatusText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: "800",
  },

  paymentCard: {
    marginBottom: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    backgroundColor: Colors.surface,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  voucherIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primaryLight,
  },

  cardTitleArea: {
    flex: 1,
    marginLeft: 11,
    paddingRight: 8,
  },

  voucherNumber: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: "800",
  },

  categoryName: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 11,
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
  },

  statusText: {
    fontSize: 9,
    fontWeight: "800",
  },

  divider: {
    height: 1,
    marginVertical: 13,
    backgroundColor: Colors.border,
  },

  payeeAmountRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },

  payeeArea: {
    flex: 1,
    paddingRight: 12,
  },

  amountArea: {
    alignItems: "flex-end",
  },

  fieldLabel: {
    color: Colors.textMuted,
    fontSize: 11,
  },

  fieldValue: {
    marginTop: 5,
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },

  amountValue: {
    marginTop: 5,
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },

  bankCard: {
    marginTop: 13,
    padding: 11,
    borderRadius: 13,
    backgroundColor: Colors.surfaceSecondary,
  },

  bankTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  bankName: {
    flex: 1,
    marginLeft: 7,
    color: Colors.textPrimary,
    fontSize: 11,
    fontWeight: "700",
  },

  bankDetailsRow: {
    marginTop: 10,
    flexDirection: "row",
    columnGap: 12,
  },

  bankDetailItem: {
    flex: 1,
  },

  bankDetailLabel: {
    color: Colors.textMuted,
    fontSize: 11,
  },

  bankDetailValue: {
    marginTop: 3,
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: "600",
  },

  dateGrid: {
    fontSize:11,
    marginTop: 13,
    flexDirection: "row",
    columnGap: 7,
  },

  dateMetaItem: {
    flex: 1,
    minHeight: 58,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
  },

  dateMetaLabel: {
    color: Colors.textMuted,
    fontSize: 8,
  },

  dateMetaValue: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "600",
  },

  payNowButton: {
    minHeight: 46,
    marginTop: 14,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    columnGap: 8,
    backgroundColor: Colors.primary,
  },

  payNowText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "800",
  },

  stateContainer: {
    flex: 1,
    paddingHorizontal: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyContainer: {
    minHeight: 300,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  stateIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primaryLight,
  },

  stateTitle: {
    marginTop: 14,
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: "800",
  },

  stateText: {
    marginTop: 8,
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },

  retryButton: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },

  retryText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "800",
  },

  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(16, 24, 40, 0.48)',
  },
  
modalSheet: {
  maxHeight: '84%',
  backgroundColor: Colors.white,
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  paddingHorizontal: 20,
  paddingTop: 20,
},

  modalHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: "center",
    backgroundColor: Colors.border,
  },

  modalHeader: {
    paddingTop: 17,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },

  modalTitleArea: {
    flex: 1,
    paddingRight: 12,
  },

  modalTitle: {
    color: Colors.textPrimary,
    fontSize: 19,
    fontWeight: "800",
  },

  modalSubtitle: {
    marginTop: 4,
    color: Colors.textMuted,
    fontSize: 10,
  },

  modalClose: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surfaceSecondary,
  },

  filterLabel: {
    marginBottom: 8,
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },

  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },

  statusChip: {
    minWidth: "30%",
    minHeight: 39,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surfaceSecondary,
  },

  statusChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },

  statusChipText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: "600",
  },

  statusChipTextSelected: {
    color: Colors.primary,
    fontWeight: "800",
  },

  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },

  categoryChip: {
    minHeight: 38,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 11,
    justifyContent: "center",
    backgroundColor: Colors.surfaceSecondary,
  },

  categoryChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },

  categoryChipText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: "600",
  },

  categoryChipTextSelected: {
    color: Colors.primary,
    fontWeight: "800",
  },

  dateLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  clearDateText: {
    marginBottom: 8,
    color: Colors.danger,
    fontSize: 10,
    fontWeight: "700",
  },

  dateRow: {
    flexDirection: "row",
    columnGap: 10,
  },

  dateColumn: {
    flex: 1,
  },

  dateInputLabel: {
    marginBottom: 6,
    color: Colors.textMuted,
    fontSize: 9,
  },

  dateInput: {
    minHeight: 47,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    columnGap: 7,
  },

  dateInputText: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 10,
    fontWeight: "600",
  },

  datePlaceholder: {
    color: Colors.textMuted,
  },

  filterActionRow: {
    marginTop: 20,
    flexDirection: "row",
    columnGap: 10,
  },

  resetButton: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  resetButtonText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },

  applyButton: {
    flex: 1.4,
    minHeight: 48,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    columnGap: 7,
    backgroundColor: Colors.primary,
  },

  applyButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "800",
  },

  safeArea: {
  flex: 1,
  backgroundColor: Colors.background,
},

container: {
  flex: 1,
  backgroundColor: Colors.background,
},

header: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 16,
  paddingTop: 12,
  paddingBottom: 14,
},

headerContent: {
  flex: 1,
  paddingRight: 12,
},

title: {
  fontSize: 21,
  fontWeight: '800',
  color: Colors.textPrimary,
},

  subtitle: {
  marginTop: 4,
  fontSize: 12,
  color: Colors.textSecondary,
},
});
