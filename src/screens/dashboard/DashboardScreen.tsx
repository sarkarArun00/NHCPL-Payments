import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  View,
  StyleSheet,
  Alert,
} from 'react-native';
import {Colors} from '../../constants/colors';
import {Spacing} from '../../constants/spacing';

import {
  CommonActions,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';


import {
  MaterialDesignIcons,
} from '@react-native-vector-icons/material-design-icons/static';


import {useAuthStore} from '../../store/authStore';
import {useCenterStore} from '../../store/centerStore';
import {useDashboardStore} from '../../store/dashboardStore';
import { useVoucherStore } from '../../store/voucherStore';
import {
  useNotificationStore,
} from '../../store/notificationStore';

import {Center} from '../../types/center.types';
import { ExpenseVoucher } from '../../types/voucher.types';

import type {
  ExpenseStatus,
} from '../../types/voucher.types';
import VoucherTypeModal from '../../components/VoucherTypeModal';




type DashboardStatus =
  | 'CREATED'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'SETTLED'
  | 'FAILED';

type DashboardFilterState = {
  status: DashboardStatus;
  fromDate: Date | null;
  toDate: Date | null;
};

const DASHBOARD_STATUS_OPTIONS: Array<{
  label: string;
  value: DashboardStatus;
}> = [
  {
    label: 'Created',
    value: 'CREATED',
  },
  {
    label: 'Pending',
    value: 'PENDING',
  },
  {
    label: 'Approved',
    value: 'APPROVED',
  },
  {
    label: 'Rejected',
    value: 'REJECTED',
  },
  {
    label: 'Settled',
    value: 'SETTLED',
  },
  {
    label: 'Failed',
    value: 'FAILED',
  },
];

const isDashboardDateOptional = (
  status: DashboardStatus,
): boolean => {
  return [
    'CREATED',
    'PENDING',
  ].includes(status);
};

const formatINR = (
  amount: number | string | null | undefined,
): string => {
  const numericAmount = Number(amount ?? 0);

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(
    Number.isFinite(numericAmount)
      ? numericAmount
      : 0,
  );
};
  
const createDefaultDashboardFilter =
  (): DashboardFilterState => {
    const toDate = new Date();

    const fromDate = new Date(
      toDate,
    );

    fromDate.setDate(
      fromDate.getDate() - 7,
    );

    return {
      status: 'CREATED',
      fromDate,
      toDate,
    };
  };

type SummaryCardProps = {
  title: string;
  value: string;
  icon: string;
  iconBackground: string;
  iconColor: string;
  onPress?: () => void;
  percentageChange?: number;
};

const SummaryCard = ({
  title,
  value,
  icon,
  iconBackground,
  iconColor,
  onPress,
  percentageChange,
}: SummaryCardProps) => {
  const changeValue = Number(
    percentageChange ?? 0,
  );

  const changeIcon =
    changeValue > 0
      ? 'trending-up'
      : changeValue < 0
        ? 'trending-down'
        : 'minus';

  const changeColor =
    changeValue > 0
      ? Colors.success
      : changeValue < 0
        ? Colors.danger
        : Colors.textSecondary;
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({pressed}) => [
        styles.summaryCard,
        pressed && onPress
          ? styles.summaryCardPressed
          : undefined,
      ]}>
      <View
        style={[
          styles.summaryIcon,
          {
            backgroundColor:
              iconBackground,
          },
        ]}>
        <MaterialDesignIcons
          name={icon as any}
          size={22}
          color={iconColor}
        />
      </View>

      <Text style={styles.summaryValue}>
        {value}
      </Text>

      {percentageChange !==
        undefined ? (
          <View
            style={
              styles.summaryPercentageRow
            }>
            <MaterialDesignIcons
              name={
                changeIcon as any
              }
              size={15}
              color={changeColor}
            />

            <Text
              style={[
                styles.summaryPercentageText,
                {
                  color:
                    changeColor,
                },
              ]}>
              {Math.abs(
                changeValue,
              )}
              %
            </Text>
          </View>
        ) : null}

      <Text style={styles.summaryTitle}>
        {title}
      </Text>
    </Pressable>
  );
}

function formatDashboardDate(
  value?: string,
): string {
  if (!value) {
    return 'Date not available';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  );
}

function getDashboardStatusConfig(
  status: string,
) {
  switch (
    String(status).toUpperCase()
  ) {
    case 'APPROVED':
      return {
        color: Colors.success,
        background:
          Colors.successLight,
      };

    case 'REJECTED':
      return {
        color: Colors.danger,
        background:
          Colors.dangerLight,
      };

    case 'PENDING':
      return {
        color: Colors.warning,
        background:
          Colors.warningLight,
      };

    case 'SETTLED':
      return {
        color: Colors.info,
        background:
          Colors.infoLight,
      };

    case 'FAILED':
      return {
        color: Colors.danger,
        background:
          Colors.dangerLight,
      };

    default:
      return {
        color: Colors.textMuted,
        background:
          Colors.surfaceSecondary,
      };
  }
}

const getCenterName = (
  center: Center,
): string => {
  return (
    center.name?.trim() ||
    center.centre_name?.trim() ||
    center.center_name?.trim() ||
    center.centreName?.trim() ||
    center.centerName?.trim() ||
    `Center ${center.id}`
  );
};

const getIstGreeting = (): string => {
  /*
   * IST is UTC + 5 hours 30 minutes.
   * Using UTC methods prevents device-timezone differences.
   */
  const istDate = new Date(
    Date.now() + 5.5 * 60 * 60 * 1000,
  );

  const hour = istDate.getUTCHours();

  if (hour >= 5 && hour < 12) {
    return 'Good morning';
  }

  if (hour >= 12 && hour < 17) {
    return 'Good afternoon';
  }

  if (hour >= 17 && hour < 21) {
    return 'Good evening';
  }

  return 'Good night';
};

export default function DashboardScreen() {
 const insets = useSafeAreaInsets();
  const navigation = useNavigation();

    const unreadNotificationCount =
    useNotificationStore(
      state => state.unreadCount,
    );

  const loadNotifications =
    useNotificationStore(
      state =>
        state.loadNotifications,
    );
  
  const openVoucherList = useCallback(
    (status: ExpenseStatus) => {
      navigation.dispatch(
        CommonActions.navigate({
          name: 'Vouchers',
          params: {
            initialStatus: status,
          },
        }),
      );
    },
    [navigation],
  );
  const session = useAuthStore(
    state => state.session,
  );

  const [
  greeting,
  setGreeting,
  ] = useState(getIstGreeting());
  
  const [
  isCustomDateFilterApplied,
  setIsCustomDateFilterApplied,
  ] = useState(false);
  
  const [
  voucherTypeModalVisible,
  setVoucherTypeModalVisible,
] = useState(false);
  
  const dashboardEmployee =
  session?.employee as any;

const dashboardRole = String(
  dashboardEmployee?.userTypeName ??
    dashboardEmployee?.user_type_name ??
    dashboardEmployee?.user_type ??
    dashboardEmployee?.roleName ??
    dashboardEmployee?.role_name ??
    dashboardEmployee?.role ??
    '',
)
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

const isAdminSummaryUser = [
  'admin',
  'administrator',
  'superadmin',
  'director',
  'super admin',
  'superadministrator',
].includes(dashboardRole);

const isEmployeeSummaryUser =
  dashboardRole === 'employee';
  
  const initializedCenterIdRef =
    useRef<number>(0);
  
  const {
    centers,
    selectedCenterId,
    selectedCenter,
    isLoadingCenters,
    centerError,
    loadCenters,
    setSelectedCenter,
  } = useCenterStore();


  const canViewCreatedStatus =
  dashboardRole === 'employee';

const visibleDashboardStatusOptions =
  useMemo(
    () =>
      DASHBOARD_STATUS_OPTIONS.filter(
        option =>
          canViewCreatedStatus ||
          option.value !== 'CREATED',
      ),
    [canViewCreatedStatus],
  );
  console.log('selectedCenterId selectedCenterId', selectedCenterId)
  const {
    summary,
    isLoading,
    isRefreshing,
    error,
    loadDashboard,
  } = useDashboardStore();

  const loginCenterId = Number(
  session?.centreId ??
    null,
);

  const vouchers = useVoucherStore(
    state => state.vouchers,
  );

  const loadVouchers = useVoucherStore(
    state => state.loadVouchers,
  );

  const isLoadingVouchers =
    useVoucherStore(
      state => state.isLoading,
    );

  const [
    isCenterModalVisible,
    setIsCenterModalVisible,
  ] = useState(false);

  const employeeId = Number(
    session?.employee?.id || 0,
  );


  const employeeName =
    session?.employee?.employee_name ||
    'Employee';

  const centreId = Number(
    selectedCenterId ||
      session?.centreId ||
      0,
  );

  const [
  isDashboardFilterVisible,
  setIsDashboardFilterVisible,
] = useState(false);

  
const [
  dashboardFilter,
  setDashboardFilter,
] = useState<DashboardFilterState>(
  createDefaultDashboardFilter,
);

const [
  draftDashboardFilter,
  setDraftDashboardFilter,
] = useState<DashboardFilterState>(
  createDefaultDashboardFilter,
);

const [
  visibleDatePicker,
  setVisibleDatePicker,
] = useState<
  'fromDate' | 'toDate' | null
>(null);

  const recentVouchers =
    useMemo(() => {
      if (!Array.isArray(vouchers)) {
        return [];
      }

      return [...vouchers]
        .sort((first: any, second: any) => {
          const firstDate = new Date(
            first?.created_at ||
              first?.expense_date ||
              0,
          ).getTime();

          const secondDate = new Date(
            second?.created_at ||
              second?.expense_date ||
              0,
          ).getTime();

          return secondDate - firstDate;
        })
        .slice(0, 5);
    }, [vouchers]);

  /*
   * Load center list only when login center
   * becomes available.
   */
  useEffect(() => {
    if (employeeId <= 0) {
      return;
    }

    void loadCenters(
      employeeId,
      loginCenterId,
    );
  }, [
    employeeId,
    loginCenterId,
    loadCenters,
  ]);

    useFocusEffect(
    useCallback(() => {
      void loadNotifications(false);
    }, [loadNotifications]),
  );


  useEffect(() => {
  const updateGreeting = () => {
    setGreeting(getIstGreeting());
  };

  updateGreeting();

  const intervalId = setInterval(
    updateGreeting,
    60 * 1000,
  );

  return () => {
    clearInterval(intervalId);
  };
}, []);

  
  const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0');
  const day = String(
    date.getDate(),
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
  };
  
  const formatDashboardCaptionDate = (
  value: Date | string | null | undefined,
): string => {
  if (!value) {
    return '';
  }

  const parsedDate =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  const day = String(
    parsedDate.getDate(),
  ).padStart(2, '0');

  const month = parsedDate.toLocaleString(
    'en-US',
    {
      month: 'long',
    },
  );

  const year = parsedDate.getFullYear();

  return `${day}-${month}-${year}`;
};
  /*
   * Load dashboard according to active center.
   */

  const fetchDashboard = useCallback(
  async (
    refresh = false,
    filterOverride?: DashboardFilterState,
  ) => {
    if (
      employeeId <= 0 ||
      centreId <= 0
    ) {
      return;
    }

    const selectedFilter =
      filterOverride ??
      dashboardFilter;

    const payload: {
      center_id: number;
      user_id: number;
      payment_mode: string;
      status: DashboardStatus;
      fromDate?: string;
      toDate?: string;
    } = {
      center_id: centreId,
      user_id: employeeId,
      payment_mode: 'BANK',
      status:
        selectedFilter.status,
    };

    /*
     * Dates are omitted when they
     * are not selected.
     */
    if (
      selectedFilter.fromDate
    ) {
      payload.fromDate =
        formatDate(
          selectedFilter.fromDate,
        );
    }

    if (selectedFilter.toDate) {
      payload.toDate =
        formatDate(
          selectedFilter.toDate,
        );
    }

    await loadDashboard(
      payload,
      refresh,
    );
  },
  [
    centreId,
    employeeId,
    dashboardFilter,
    loadDashboard,
  ],
  );
  
  const openDashboardFilter =
  () => {
    setDraftDashboardFilter({
      status:
        dashboardFilter.status,

      fromDate:
        dashboardFilter.fromDate
          ? new Date(
              dashboardFilter.fromDate,
            )
          : null,

      toDate:
        dashboardFilter.toDate
          ? new Date(
              dashboardFilter.toDate,
            )
          : null,
    });

    setVisibleDatePicker(null);
    setIsDashboardFilterVisible(
      true,
    );
  };

  const closeDashboardFilter =
    () => {
      setVisibleDatePicker(null);
      setIsDashboardFilterVisible(
        false,
      );
    };

  const handleDashboardDateChange = (
  event: DateTimePickerEvent,
  selectedDate?: Date,
) => {
  const pickerType =
    visibleDatePicker;

  setVisibleDatePicker(null);

  if (
    event.type === 'dismissed' ||
    !selectedDate ||
    !pickerType
  ) {
    return;
  }

  setDraftDashboardFilter(
    currentFilter => {
      if (
        pickerType ===
        'fromDate'
      ) {
        return {
          ...currentFilter,
          fromDate: selectedDate,

          /*
           * Remove invalid to-date.
           */
          toDate:
            currentFilter.toDate &&
            selectedDate >
              currentFilter.toDate
              ? null
              : currentFilter.toDate,
        };
      }

      return {
        ...currentFilter,
        toDate: selectedDate,
      };
    },
  );
  };
  
  const applyDashboardFilter =
  async () => {
    const {
      status,
      fromDate,
      toDate,
    } = draftDashboardFilter;

    const datesOptional =
      isDashboardDateOptional(
        status,
      );

    /*
     * For Approved, Rejected,
     * Settled and Failed,
     * both dates are mandatory.
     */
    if (
      !datesOptional &&
      (!fromDate || !toDate)
    ) {
      Alert.alert(
        'Date required',
        `From date and To date are required for ${status.toLowerCase()} status.`,
      );

      return;
    }

    /*
     * Even for Created/Pending,
     * when one date is entered,
     * the other date is required.
     */
    if (
      Boolean(fromDate) !==
      Boolean(toDate)
    ) {
      Alert.alert(
        'Incomplete date range',
        'Please select both From date and To date, or clear both dates.',
      );

      return;
    }

    if (
      fromDate &&
      toDate &&
      fromDate > toDate
    ) {
      Alert.alert(
        'Invalid date range',
        'From date cannot be after To date.',
      );

      return;
    }

    const nextFilter: DashboardFilterState =
      {
        status,
        fromDate,
        toDate,
      };

    setDashboardFilter(
      nextFilter,
    );

    /*
     * When dates are applied from
     * the filter modal, rejected and
     * failed summary values use counts.
     */
    setIsCustomDateFilterApplied(
      Boolean(
        fromDate && toDate,
      ),
    );

    setVisibleDatePicker(null);
    setIsDashboardFilterVisible(
      false,
    );

    await fetchDashboard(
      true,
      nextFilter,
    );
    };
  
  const resetDashboardFilter =
  async () => {
    const defaultFilter =
      createDefaultDashboardFilter();

    setDraftDashboardFilter(
      defaultFilter,
    );

    setDashboardFilter(
      defaultFilter,
    );

    setIsCustomDateFilterApplied(
      false,
    );

    setVisibleDatePicker(null);
    setIsDashboardFilterVisible(
      false,
    );

    await fetchDashboard(
      true,
      defaultFilter,
    );
    };
  
  const displayDashboardDate = (
  date: Date | null,
): string => {
  return date
    ? formatDate(date)
    : 'Select date';
};

const areDraftDatesOptional =
  isDashboardDateOptional(
    draftDashboardFilter.status,
  );

  /*
   * Load recent vouchers according to active center.
   */
  const fetchRecentVouchers =
    useCallback(async () => {
      if (
        employeeId <= 0 ||
        centreId <= 0
      ) {
        return;
      }

      await loadVouchers({
        center_id: centreId,
        user_id: employeeId,
        page: 1,
        limit: 5,
        payment_mode: 'BANK'
      });
    }, [
      centreId,
      employeeId,
      loadVouchers,
    ]);

  /*
   * Reload both sections whenever center changes.
   */
  useEffect(() => {
    fetchDashboard(false);
    fetchRecentVouchers();
  }, [
    fetchDashboard,
    fetchRecentVouchers,
  ]);

  const handleRefresh =
    useCallback(async () => {
      await Promise.all([
        fetchDashboard(true),
        fetchRecentVouchers(),
        
        
      ]);

          if (employeeId <= 0) {
      return;
    }

    void loadCenters(
      employeeId,
      loginCenterId,
    );
    }, [
      fetchDashboard,
      fetchRecentVouchers,
      employeeId,
      loginCenterId,
      loadCenters,
    ]);

  const handleCenterSelect = (
    center: Center,
  ) => {
    setSelectedCenter(center);
    setIsCenterModalVisible(false);
  };

  useEffect(() => {
  if (canViewCreatedStatus) {
    return;
  }

  setDashboardFilter(
    currentFilter => {
      if (
        currentFilter.status !==
        'CREATED'
      ) {
        return currentFilter;
      }

      return {
        ...currentFilter,
        status: 'PENDING',
      };
    },
  );

  setDraftDashboardFilter(
    currentFilter => {
      if (
        currentFilter.status !==
        'CREATED'
      ) {
        return currentFilter;
      }

      return {
        ...currentFilter,
        status: 'PENDING',
      };
    },
  );
}, [canViewCreatedStatus]);
  
  

const openCreateVoucher = () => {
  setVoucherTypeModalVisible(true);
};

const openSingleVoucher = () => {
  setVoucherTypeModalVisible(false);

  navigation.dispatch(
    CommonActions.navigate({
      name: 'SingleVoucher',
    }),
  );
};

const openBulkVoucher = () => {
  setVoucherTypeModalVisible(false);

  navigation.dispatch(
    CommonActions.navigate({
      name: 'CreateVoucher',
    }),
  );
};

  const openVoucherDetails = (
    voucher: any,
  ) => {
    const payment =
      voucher?.payments?.[0];

    const voucherInfo =
      payment?.voucher;

    const voucherNumber = String(
      voucherInfo?.voucher_no ||
        voucher?.voucher_no ||
        voucher?.voucherNo ||
        `Expense #${voucher?.id || ''}`,
    );

    const categoryName = String(
      voucher?.category
        ?.category_name ||
        voucher?.category_name ||
        'Expense',
    );

    const amount = Number(
      voucher?.net_payable ??
        voucher?.netPayable ??
        voucher?.gross_amount ??
        0,
    );

    const status = String(
      voucher?.status || 'UNKNOWN',
    ).toUpperCase();

const selectedVoucherData =
  voucher as ExpenseVoucher;

    useVoucherStore
      .getState()
      .setSelectedVoucher(
        selectedVoucherData,
      );

    navigation.dispatch(
      CommonActions.navigate({
        name: 'VoucherDetails',
      }),
    );
  };


const pendingApprovalCount =
  Number(
    summary?.counts?.pending ?? 0,
  );

const queriesRaisedCount =
  Number(
    summary?.comments
      ?.queriesRaised ?? 0,
  );

const queriesSolvedCount =
  Number(
    summary?.comments
      ?.resolvedComments ?? 0,
  );

/*
 * Default dashboard:
 * use last_week_data.
 *
 * Custom date search:
 * use counts.
 */
const failedPaymentsCount =
  isCustomDateFilterApplied
    ? Number(
        summary?.counts?.failed ?? 0,
      )
    : Number(
        summary?.last_week_data
          ?.failed ?? 0,
      );

const rejectedPaymentsCount =
  isCustomDateFilterApplied
    ? Number(
        summary?.counts?.rejected ?? 0,
      )
    : Number(
        summary?.last_week_data
          ?.rejected ?? 0,
    );
  

const currentCentreName = selectedCenter
  ? getCenterName(selectedCenter)
  : selectedCenterId
    ? `Center ${selectedCenterId}`
    : 'Select center';



  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top']}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={
          Colors.primary
        }
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={
          styles.contentContainer
        }
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }>
        {isLoading && !summary ? (
          <View
            style={
              styles.stateContainer
            }>
            <ActivityIndicator
              size="large"
              color={Colors.primary}
            />

          {/* <View
            style={
              styles.summaryHeaderRow
            }>
            <View style={styles.summaryHeaderRow}>
              <View style={styles.summaryHeaderContent}>
                <Text style={styles.sectionTitle}>
                  Payment summary
                </Text>

            <Text style={styles.paymentSummaryFilterText}>
              {dashboardFilter.status}

              {dashboardFilter.fromDate &&
              dashboardFilter.toDate
                ? ` • ${formatDashboardCaptionDate(
                    dashboardFilter.fromDate,
                  )} to ${formatDashboardCaptionDate(
                    dashboardFilter.toDate,
                  )}`
                : ''}
            </Text>
            </View>

            <Pressable
              onPress={openDashboardFilter}
              hitSlop={10}
              style={({pressed}) => [
                styles.dashboardFilterButton,
                pressed && styles.pressed,
              ]}>
              <MaterialDesignIcons
                name="filter-variant"
                size={22}
                color={Colors.primary}
              />
            </Pressable>
          </View> */}

            {/* <Pressable
              onPress={
                openDashboardFilter
              }
              style={({pressed}) => [
                styles.dashboardFilterButton,
                pressed &&
                  styles.pressed,
              ]}>
              <MaterialDesignIcons
                name="filter-variant"
                size={21}
                color={Colors.primary}
              />
            </Pressable>
          </View> */}
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <MaterialDesignIcons
              name="alert-circle-outline"
              size={22}
              color={Colors.danger}
            />

            <Text
              style={styles.errorText}>
              {error}
            </Text>

            <Pressable
              style={styles.retryButton}
              onPress={() =>
                fetchDashboard(false)
              }>
              <Text
                style={
                  styles.retryButtonText
                }>
                Retry
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.header}>
          <View
            style={styles.headerTop}>
            <View>
            <Text style={styles.greeting}>
              {greeting}
            </Text>

            <Text style={styles.userName}>
              {employeeName}
            </Text>
          </View>

              <Pressable
                onPress={() =>
                  navigation.dispatch(
                    CommonActions.navigate({
                      name: 'Notification',
                    }),
                  )
                }
                style={({pressed}) => [
                  styles.notificationButton,
                  pressed &&
                    styles.pressed,
                ]}>
              <MaterialDesignIcons
                name="bell-outline"
                size={23}
                color={Colors.white}
              />

            {unreadNotificationCount > 0 ? (
              <View
                style={
                  styles.notificationBadge
                }>
                <Text
                  style={
                    styles.notificationBadgeText
                  }>
                  {unreadNotificationCount > 99
                    ? '99+'
                    : String(
                        unreadNotificationCount,
                      )}
                </Text>
              </View>
            ) : null}
            </Pressable>
          </View>

        <View
            style={styles.balanceCard}>
            <Pressable
          onPress={() =>
            setIsCenterModalVisible(
              true,
            )
          }
            style={styles.centerSelector}>
            <View
            style={
              styles.centerSelectorContent
            }>
            <Text
              style={styles.centerLabel}>
              Current center
            </Text>

            <Text
              style={styles.centerName}>
              {selectedCenter
                ? getCenterName(
                    selectedCenter,
                  )
                : selectedCenterId
                  ? `Center ${selectedCenterId}`
                  : 'Select center'}
              </Text>
            </View>

            {isLoadingCenters ? (
              <ActivityIndicator
                size="small"
                color={Colors.primary}
              />
            ) : (
            <View
              style={
                styles.changeCenterArea
              }>
              <Text
                style={
                  styles.changeCenterText
                }>
                Change
              </Text>

              <MaterialDesignIcons
                name="chevron-down"
                size={20}
                color={Colors.primary}
              />
            </View>
            )}
            </Pressable>
          </View>
      </View>

        

        <View style={styles.body}>
          <View
            style={styles.sectionHeader}>
            {/* <Text
              style={styles.sectionTitle}>
              Payment summary
            </Text> */}

            
          </View>

          <View style={styles.paymentSummaryHeader}>
          <View style={styles.paymentSummaryTitleArea}>
            <Text style={styles.sectionTitle}>
              Payment summary
            </Text>

              <Text style={styles.paymentSummaryFilterText}>
              {dashboardFilter.status}

              {dashboardFilter.fromDate &&
              dashboardFilter.toDate
                ? ` • ${formatDashboardCaptionDate(
                    dashboardFilter.fromDate,
                  )} to ${formatDashboardCaptionDate(
                    dashboardFilter.toDate,
                  )}`
                : ''}
            </Text>
            {/* <Text style={styles.paymentSummaryFilterText}>
              {dashboardFilter.status}

              {dashboardFilter.fromDate &&
              dashboardFilter.toDate
                ? ` • ${formatDate(
                    dashboardFilter.fromDate,
                  )} - ${formatDate(
                    dashboardFilter.toDate,
                  )}`
                : ''}
            </Text> */}
          </View>

          <Pressable
            onPress={openDashboardFilter}
            hitSlop={10}
            style={({pressed}) => [
              styles.dashboardFilterButton,
              pressed && styles.pressed,
            ]}>
            <MaterialDesignIcons
              name="filter-variant"
              size={22}
              color={Colors.primary}
            />
          </Pressable>
        </View>

          <View style={styles.summaryGrid}>
               <SummaryCard
              title="Total Payments"
              value={formatINR(
                summary?.totals
                  ?.total_settled_amount,
              )}
              // percentageChange={Number(
              //   summary?.totals
              //     ?.percentage_change ?? 0,
              // )}
              icon="cash-multiple"
              iconBackground={
                Colors.successLight
              }
              iconColor={Colors.success}
            />
            
            

                {isAdminSummaryUser ? (
                  <>
                    <SummaryCard
                      title="Queries Solved"
                      value={String(
                        queriesSolvedCount,
                      )}
                      icon="comment-check-outline"
                      iconBackground={
                        Colors.successLight
                      }
                      iconColor={Colors.success}
                    />

                    <SummaryCard
                      title="Pending Approval"
                      value={String(
                        pendingApprovalCount,
                      )}
                      icon="clock-outline"
                      iconBackground={
                        Colors.warningLight
                      }
                      iconColor={Colors.warning}
                      onPress={() =>
                        openVoucherList(
                          'PENDING',
                        )
                      }
                    />

                    <SummaryCard
                      title="Failed Payments"
                      value={String(
                        failedPaymentsCount,
                      )}
                      icon="alert-circle-outline"
                      iconBackground={
                        Colors.dangerLight
                      }
                      iconColor={Colors.danger}
                      onPress={() =>
                        openVoucherList(
                          'FAILED',
                        )
                      }
                    />
                  </>
              ) : isEmployeeSummaryUser ? (
                  <>
                    <SummaryCard
                      title="Queries Raised"
                      value={String(
                        queriesRaisedCount,
                      )}
                      icon="comment-question-outline"
                      iconBackground={
                        Colors.warningLight
                      }
                      iconColor={Colors.warning}
                    />

                    <SummaryCard
                      title="Pending Approval"
                      value={String(
                        pendingApprovalCount,
                      )}
                      icon="clock-outline"
                      iconBackground={
                        Colors.warningLight
                      }
                      iconColor={Colors.warning}
                      onPress={() =>
                        openVoucherList(
                          'PENDING',
                        )
                      }
                    />

                    <SummaryCard
                      title="Rejected Payments"
                      value={String(
                        rejectedPaymentsCount,
                      )}
                      icon="close-circle-outline"
                      iconBackground={
                        Colors.dangerLight
                      }
                      iconColor={Colors.danger}
                      onPress={() =>
                        openVoucherList(
                          'REJECTED',
                        )
                      }
                    />
                  </>
                ) : null}
              </View>

          <Pressable
            style={
              styles.createVoucherButton
            }
            onPress={
              openCreateVoucher
            }>
            <View
              style={
                styles.createVoucherIcon
              }>
              <MaterialDesignIcons
                name="file-plus-outline"
                size={26}
                color={Colors.primary}
              />
            </View>

            <View
              style={
                styles.createVoucherContent
              }>
              <Text
                style={
                  styles.createVoucherTitle
                }>
                Create payment voucher
              </Text>

            <Text style={styles.createVoucherDescription}>
              Create a single voucher or upload vouchers in bulk
            </Text>
            </View>

            <MaterialDesignIcons
              name="chevron-right"
              size={26}
              color={
                Colors.textSecondary
              }
            />
          </Pressable>

          <View
            style={styles.sectionHeader}>
            <Text
              style={styles.sectionTitle}>
              Recent vouchers
            </Text>

        <Pressable
          onPress={() =>
            openVoucherList('PENDING')
          }>
          <Text style={styles.viewAll}>
            View all
          </Text>
        </Pressable>
          </View>

          {isLoadingVouchers &&
          recentVouchers.length === 0 ? (
            <View
              style={
                styles.recentVoucherLoading
              }>
              <ActivityIndicator
                size="small"
                color={Colors.primary}
              />

              <Text
                style={
                  styles.recentVoucherLoadingText
                }>
                Loading recent
                vouchers...
              </Text>
            </View>
          ) : recentVouchers.length >
            0 ? (
            recentVouchers.map(
              (voucher: any) => {
                const payment =
                  voucher?.payments?.[0];

                const voucherInfo =
                  payment?.voucher;

                const voucherNumber =
                  String(
                    voucherInfo
                      ?.voucher_no ||
                      voucher?.voucher_no ||
                      voucher?.voucherNo ||
                      `Expense #${voucher?.id}`,
                  );

                const categoryName =
                  String(
                    voucher?.category
                      ?.category_name ||
                      voucher
                        ?.category_name ||
                      'Expense',
                  );

                const amount = Number(
                  voucher?.net_payable ??
                    voucher?.netPayable ??
                    voucher
                      ?.gross_amount ??
                    0,
                );

                const status = String(
                  voucher?.status ||
                    'UNKNOWN',
                ).toUpperCase();

                const statusConfig =
                  getDashboardStatusConfig(
                    status,
                  );

                return (
                  <Pressable
                    key={String(
                      voucher?.id,
                    )}
                    onPress={() =>
                      openVoucherDetails(
                        voucher,
                      )
                    }
                    style={({pressed}) => [
                      styles.voucherCard,

                      pressed &&
                        styles.pressed,
                    ]}>
                    <View
                      style={
                        styles.voucherIcon
                      }>
                      <MaterialDesignIcons
                        name="receipt-text-outline"
                        size={24}
                        color={
                          Colors.primary
                        }
                      />
                    </View>

                    <View
                      style={
                        styles.voucherContent
                      }>
                      <Text
                        style={
                          styles.voucherReference
                        }
                        numberOfLines={1}>
                        {voucherNumber}
                      </Text>

                      <Text
                        style={
                          styles.voucherCategory
                        }
                        numberOfLines={1}>
                        {categoryName}
                      </Text>

                      <Text
                        style={
                          styles.voucherDate
                        }>
                        {formatDashboardDate(
                          voucher
                            ?.expense_date ||
                            voucher
                              ?.created_at,
                        )}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.voucherRight
                      }>
                      <Text
                        style={
                          styles.voucherAmount
                        }>
                        ₹
                        {amount.toLocaleString(
                          'en-IN',
                          {
                            minimumFractionDigits:
                              0,

                            maximumFractionDigits:
                              2,
                          },
                        )}
                      </Text>

                      <View
                        style={[
                          styles.dynamicStatusBadge,

                          {
                            backgroundColor:
                              statusConfig.background,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.dynamicStatusBadgeText,

                            {
                              color:
                                statusConfig.color,
                            },
                          ]}>
                          {status}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              },
            )
          ) : (
            <View
              style={
                styles.emptyRecentVoucher
              }>
              <MaterialDesignIcons
                name="receipt-text-remove-outline"
                size={32}
                color={Colors.textMuted}
              />

              <Text
                style={
                  styles.emptyRecentVoucherText
                }>
                No recent vouchers found.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={isCenterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setIsCenterModalVisible(false)
        }>
        <View
          style={styles.modalContainer}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() =>
              setIsCenterModalVisible(
                false,
              )
            }
          />

          <View
            style={
              styles.centerModalSheet
            }>
            <View
              style={styles.modalHandle}
            />

            <View
              style={
                styles.centerModalHeader
              }>
              <View>
                <Text
                  style={
                    styles.centerModalTitle
                  }>
                  Select center
                </Text>

                <Text
                  style={
                    styles.centerModalSubtitle
                  }>
                  Dashboard and vouchers
                  will update automatically.
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  setIsCenterModalVisible(
                    false,
                  )
                }
                style={
                  styles.centerModalClose
                }>
                <MaterialDesignIcons
                  name="close"
                  size={21}
                  color={
                    Colors.textPrimary
                  }
                />
              </Pressable>
            </View>

            {centerError ? (
              <Text
                style={styles.centerError}>
                {centerError}
              </Text>
            ) : null}

            {isLoadingCenters &&
            centers.length === 0 ? (
              <View
                style={
                  styles.centerLoading
                }>
                <ActivityIndicator
                  size="small"
                  color={Colors.primary}
                />

                <Text
                  style={
                    styles.centerLoadingText
                  }>
                  Loading centers...
                </Text>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={
                  false
                }>
                {centers.map(center => {
              const isSelected =
                Number(center.id) ===
                Number(selectedCenterId);

              return (
                <Pressable
                  key={String(center.id)}
                  onPress={() =>
                    handleCenterSelect(center)
                  }
                      style={[
                        styles.centerItem,
                        isSelected &&
                          styles.centerItemSelected,
                      ]}>
                      <View
                        style={
                          styles.centerItemIcon
                        }>
                        <MaterialDesignIcons
                          name="hospital-building"
                          size={21}
                          color={
                            isSelected
                              ? Colors.primary
                              : Colors.textMuted
                          }
                        />
                      </View>

                      <View
                        style={
                          styles.centerItemContent
                        }>
                        <Text
                          style={
                            styles.centerItemName
                          }>
                          {getCenterName(
                            center,
                          )}
                        </Text>

                        <Text
                          style={
                            styles.centerItemCode
                          }>
                          Center ID:{' '}
                          {center.id}
                        </Text>
                      </View>

                      {isSelected ? (
                        <MaterialDesignIcons
                          name="check-circle"
                          size={22}
                          color={
                            Colors.primary
                          }
                        />
                      ) : (
                        <MaterialDesignIcons
                          name="chevron-right"
                          size={22}
                          color={
                            Colors.textMuted
                          }
                        />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal
  visible={
    isDashboardFilterVisible
  }
  transparent
  animationType="slide"
  statusBarTranslucent
  onRequestClose={
    closeDashboardFilter
  }>
    <View
      style={
        styles.filterModalBackdrop
      }>
      <View
        style={
          styles.filterModalContainer
        }>
        <View
          style={
            styles.filterModalHeader
          }>
          <View>
            <Text
              style={
                styles.filterModalTitle
              }>
              Filter dashboard
            </Text>

            <Text
              style={
                styles.filterModalSubtitle
              }>
              Filter payment summary
              and vouchers
            </Text>
          </View>

          <Pressable
            hitSlop={10}
            onPress={
              closeDashboardFilter
            }
            style={
              styles.filterCloseButton
            }>
            <MaterialDesignIcons
              name="close"
              size={22}
              color={
                Colors.textPrimary
              }
            />
          </Pressable>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.filterModalContent
          }>
          {/* Read-only centre */}
          <View style={styles.filterFieldGroup}>
    <Text style={styles.filterLabel}>
      Center
    </Text>

    <View
      style={[
        styles.filterInput,
        styles.readonlyFilterInput,
      ]}>
      <MaterialDesignIcons
        name="hospital-building"
        size={19}
        color={Colors.textSecondary}
      />

      <Text
        numberOfLines={1}
        style={styles.readonlyFilterText}>
        {currentCentreName}
      </Text>

      <MaterialDesignIcons
        name="lock-outline"
        size={17}
        color={Colors.textSecondary}
      />
    </View>
  </View>

          {/* Status */}
          <View
            style={
              styles.filterFieldGroup
            }>
            <Text
              style={
                styles.filterLabel
              }>
              Status
            </Text>

            <View
              style={
                styles.statusOptionGrid
              }>
              {visibleDashboardStatusOptions.map(
                option => {
                  const isSelected =
                    draftDashboardFilter.status ===
                    option.value;

                  return (
                    <Pressable
                      key={
                        option.value
                      }
                      onPress={() =>
                        setDraftDashboardFilter(
                          current => ({
                            ...current,
                            status:
                              option.value,
                          }),
                        )
                      }
                      style={({pressed}) => [
                        styles.statusOption,

                        isSelected &&
                          styles.statusOptionSelected,

                        pressed &&
                          styles.pressed,
                      ]}>
                      <Text
                        style={[
                          styles.statusOptionText,

                          isSelected &&
                            styles.statusOptionTextSelected,
                        ]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                },
              )}
            </View>
          </View>

          {/* Date heading */}
          <View
            style={
              styles.dateFieldHeader
            }>
            <Text
              style={
                styles.filterLabel
              }>
              Date range{' '}
              {areDraftDatesOptional
                ? '(Optional)'
                : '*'}
            </Text>

            {areDraftDatesOptional &&
            (draftDashboardFilter.fromDate ||
              draftDashboardFilter.toDate) ? (
              <Pressable
                onPress={() =>
                  setDraftDashboardFilter(
                    current => ({
                      ...current,
                      fromDate: null,
                      toDate: null,
                    }),
                  )
                }>
                <Text
                  style={
                    styles.clearDateText
                  }>
                  Clear dates
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View
            style={
              styles.dateFieldsRow
            }>
            {/* From date */}
            <View
              style={
                styles.dateFieldColumn
              }>
              <Text
                style={
                  styles.dateInputLabel
                }>
                From date
              </Text>

              <Pressable
                onPress={() =>
                  setVisibleDatePicker(
                    'fromDate',
                  )
                }
                style={
                  styles.filterDateInput
                }>
                <MaterialDesignIcons
                  name="calendar-start"
                  size={18}
                  color={
                    Colors.primary
                  }
                />

                <Text
                  style={[
                    styles.filterDateText,

                    !draftDashboardFilter.fromDate &&
                      styles.filterPlaceholderText,
                  ]}>
                  {displayDashboardDate(
                    draftDashboardFilter.fromDate,
                  )}
                </Text>
              </Pressable>
            </View>

            {/* To date */}
            <View
              style={
                styles.dateFieldColumn
              }>
              <Text
                style={
                  styles.dateInputLabel
                }>
                To date
              </Text>

              <Pressable
                onPress={() =>
                  setVisibleDatePicker(
                    'toDate',
                  )
                }
                style={
                  styles.filterDateInput
                }>
                <MaterialDesignIcons
                  name="calendar-end"
                  size={18}
                  color={
                    Colors.primary
                  }
                />

                <Text
                  style={[
                    styles.filterDateText,

                    !draftDashboardFilter.toDate &&
                      styles.filterPlaceholderText,
                  ]}>
                  {displayDashboardDate(
                    draftDashboardFilter.toDate,
                  )}
                </Text>
              </Pressable>
            </View>
          </View>

          {areDraftDatesOptional ? (
            <View
              style={
                styles.dateInformationCard
              }>
              <MaterialDesignIcons
                name="information-outline"
                size={18}
                color={Colors.info}
              />

              <Text
                style={
                  styles.dateInformationText
                }>
                Date range is optional
                for Created and Pending
                status.
              </Text>
            </View>
          ) : (
            <View
              style={
                styles.dateRequiredCard
              }>
              <MaterialDesignIcons
                name="alert-circle-outline"
                size={18}
                color={Colors.warning}
              />

              <Text
                style={
                  styles.dateRequiredText
                }>
                From date and To date
                are mandatory for this
                status.
              </Text>
            </View>
          )}
        </ScrollView>

        <View
          style={[
            styles.filterModalFooter,
            {
              paddingBottom:
                Math.max(
                  insets.bottom + 12,
                  20,
                ),
            },
          ]}>
          <Pressable
            onPress={
              resetDashboardFilter
            }
            style={({pressed}) => [
              styles.filterResetButton,
              pressed &&
                styles.pressed,
            ]}>
            <Text
              style={
                styles.filterResetButtonText
              }>
              Reset
            </Text>
          </Pressable>

          <Pressable
            onPress={
              applyDashboardFilter
            }
            style={({pressed}) => [
              styles.filterApplyButton,
              pressed &&
                styles.pressed,
            ]}>
            <MaterialDesignIcons
              name="filter-check-outline"
              size={19}
              color={Colors.white}
            />

            <Text
              style={
                styles.filterApplyButtonText
              }>
              Apply filter
            </Text>
          </Pressable>
        </View>
      </View>
    </View>

    {visibleDatePicker ? (
      <DateTimePicker
        value={
          visibleDatePicker ===
          'fromDate'
            ? draftDashboardFilter.fromDate ??
              new Date()
            : draftDashboardFilter.toDate ??
              new Date()
        }
        mode="date"
        display="default"
        maximumDate={
          visibleDatePicker ===
          'fromDate'
            ? draftDashboardFilter.toDate ??
              new Date()
            : new Date()
        }
        minimumDate={
          visibleDatePicker ===
          'toDate'
            ? draftDashboardFilter.fromDate ??
              undefined
            : undefined
        }
        onChange={
          handleDashboardDateChange
        }
      />
    ) : null}
      </Modal>

      <VoucherTypeModal
      visible={voucherTypeModalVisible}
      onClose={() =>
        setVoucherTypeModalVisible(false)
      }
      onSinglePress={openSingleVoucher}
      onBulkPress={openBulkVoucher}
    />
  </SafeAreaView>
        );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.primary,
  },

  changeCenterArea: {
  flexDirection: 'row',
  alignItems: 'center',
},

modalHandle: {
  width: 42,
  height: 5,
  borderRadius: 3,
  alignSelf: 'center',
  backgroundColor: Colors.border,
},

centerModalHeader: {
  paddingTop: 16,
  paddingBottom: 14,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},

centerModalSubtitle: {
  marginTop: 4,
  fontSize: 10,
  color: Colors.textMuted,
},

centerModalClose: {
  width: 38,
  height: 38,
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor:
    Colors.surfaceSecondary,
},

centerLoading: {
  minHeight: 150,
  alignItems: 'center',
  justifyContent: 'center',
},

centerLoadingText: {
  marginTop: 8,
  fontSize: 10,
  color: Colors.textMuted,
},

centerItemIcon: {
  width: 42,
  height: 42,
  borderRadius: 13,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor:
    Colors.surfaceSecondary,
},

centerItemContent: {
  flex: 1,
  marginLeft: 11,
},

  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  contentContainer: {
    paddingBottom: 32,
  },

  pressed: {
  opacity: 0.82,
},
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: 52,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  greeting: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    marginBottom: 3,
  },

  userName: {
    color: Colors.white,
    fontSize: 21,
    fontWeight: '700',
  },

  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },

notificationBadge: {
  position: 'absolute',
  top: 3,
  right: 3,
  minWidth: 18,
  height: 18,
  paddingHorizontal: 3,
  borderRadius: 9,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor:
    Colors.danger,
  borderWidth: 2,
  borderColor:
    Colors.primary,
},

  notificationBadgeText: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: '700',
  },

  balanceCard: {
    marginTop: 22,
    padding: 0,
    borderRadius: 20,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  balanceLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  balanceValue: {
    marginTop: 6,
    fontSize: 27,
    lineHeight: 33,
    fontWeight: '800',
    color: Colors.textPrimary,
  },

  balancePeriod: {
    marginTop: 4,
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },

  walletIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },

  body: {
    marginTop: -28,
    paddingHorizontal: Spacing.lg,
  },

  sectionHeader: {
    marginTop: 26,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  viewAll: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },

  summaryCard: {
    width: '48.2%',
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  summaryIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  summaryValue: {
    fontSize: 23,
    fontWeight: '800',
    color: Colors.textPrimary,
  },

  summaryTitle: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 13,
  },

  createVoucherButton: {
    marginTop: 22,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  createVoucherIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },

  createVoucherContent: {
    flex: 1,
    marginLeft: 14,
  },

  createVoucherTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  createVoucherDescription: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textSecondary,
  },

  voucherCard: {
    padding: 15,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  voucherIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },

  voucherContent: {
    flex: 1,
    marginLeft: 12,
  },

  voucherReference: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  voucherCategory: {
    marginTop: 3,
    fontSize: 12,
    color: Colors.textSecondary,
  },

  voucherDate: {
    marginTop: 3,
    fontSize: 11,
    color: Colors.textMuted,
  },

  voucherRight: {
    alignItems: 'flex-end',
  },

  voucherAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  pendingBadge: {
    marginTop: 7,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: Colors.warningLight,
  },

  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.warning,
  },

  approvedBadge: {
    marginTop: 7,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: Colors.successLight,
  },

  approvedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.success,
  },

  stateContainer: {
  paddingVertical: 30,
  alignItems: 'center',
  justifyContent: 'center',
},

stateText: {
  marginTop: 10,
  fontSize: 13,
  color: Colors.textSecondary,
},

errorCard: {
  marginHorizontal: 16,
  marginTop: 16,
  padding: 16,
  borderRadius: 16,
  backgroundColor: Colors.dangerLight,
  flexDirection: 'row',
  alignItems: 'center',
},

errorText: {
  flex: 1,
  marginLeft: 10,
  fontSize: 13,
  color: Colors.danger,
},

retryButton: {
  paddingHorizontal: 12,
  paddingVertical: 7,
  borderRadius: 8,
  backgroundColor: Colors.danger,
},

retryButtonText: {
  color: Colors.white,
  fontSize: 12,
  fontWeight: '700',
  },

  debugCard: {
  marginTop: 18,
  padding: 16,
  borderRadius: 16,
  backgroundColor: Colors.surface,
  borderWidth: 1,
  borderColor: Colors.border,
},

debugTitle: {
  marginBottom: 10,
  fontSize: 14,
  fontWeight: '700',
  color: Colors.textPrimary,
},

debugText: {
  fontSize: 11,
  lineHeight: 17,
  color: Colors.textSecondary,
  },

  centerSelector: {
  marginHorizontal: 16,
  marginVertical: 16,
  paddingHorizontal: 16,
  paddingVertical: 14,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: Colors.border,
  backgroundColor: Colors.surface,
  flexDirection: 'row',
  alignItems: 'center',
},

centerSelectorContent: {
  flex: 1,
},

centerLabel: {
  fontSize: 10,
  color: Colors.textMuted,
},

centerName: {
  marginTop: 4,
  fontSize: 14,
  fontWeight: '700',
  color: Colors.textPrimary,
},

changeCenterText: {
  fontSize: 11,
  fontWeight: '700',
  color: Colors.primary,
},

modalContainer: {
  flex: 1,
  justifyContent: 'flex-end',
},

modalBackdrop: {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  backgroundColor: 'rgba(16, 24, 40, 0.48)',
},

centerModalSheet: {
  maxHeight: '80%',
  paddingHorizontal: 16,
  paddingTop: 18,
  paddingBottom: 24,
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  backgroundColor: Colors.surface,
},

centerModalTitle: {
  marginBottom: 14,
  fontSize: 18,
  fontWeight: '800',
  color: Colors.textPrimary,
},

centerError: {
  marginBottom: 12,
  padding: 10,
  borderRadius: 10,
  fontSize: 10,
  color: Colors.danger,
  backgroundColor: Colors.dangerLight,
},

centerItem: {
  minHeight: 64,
  marginBottom: 9,
  paddingHorizontal: 14,
  paddingVertical: 11,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: Colors.border,
  backgroundColor: Colors.surfaceSecondary,
  flexDirection: 'row',
  alignItems: 'center',
},

centerItemSelected: {
  borderColor: Colors.primary,
  backgroundColor: Colors.primaryLight,
},

centerItemName: {
  fontSize: 12,
  fontWeight: '700',
  color: Colors.textPrimary,
},

centerItemCode: {
  marginTop: 4,
  fontSize: 9,
  color: Colors.textMuted,
},

selectedText: {
  marginLeft: 12,
  fontSize: 10,
  fontWeight: '700',
  color: Colors.primary,
  },

  recentVoucherLoading: {
  minHeight: 100,
  alignItems: 'center',
  justifyContent: 'center',
},

recentVoucherLoadingText: {
  marginTop: 8,
  fontSize: 10,
  color: Colors.textMuted,
},

dynamicStatusBadge: {
  marginTop: 7,
  paddingHorizontal: 9,
  paddingVertical: 5,
  borderRadius: 10,
},

dynamicStatusBadgeText: {
  fontSize: 8,
  fontWeight: '800',
},

emptyRecentVoucher: {
  minHeight: 130,
  borderRadius: 16,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor:
    Colors.surface,
  borderWidth: 1,
  borderColor: Colors.border,
},

emptyRecentVoucherText: {
  marginTop: 8,
  fontSize: 10,
  color: Colors.textMuted,
  },
summaryCardPressed: {
  opacity: 0.75,
  transform: [
    {
      scale: 0.98,
    },
  ],
  },
summaryIcon: {
  width: 42,
  height: 42,
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 12,
  },
summaryPercentageRow: {
  marginTop: 5,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
},

summaryPercentageText: {
  fontSize: 11,
  fontWeight: '700',
  },
summaryHeaderRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent:
    'space-between',
  marginBottom: 12,
},

summaryFilterCaption: {
  marginTop: 3,
  fontSize: 10,
  color: Colors.textSecondary,
},

dashboardFilterButton: {
  width: 40,
  height: 40,
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor:
    Colors.primaryLight,
},

filterModalBackdrop: {
  flex: 1,
  justifyContent: 'flex-end',
  backgroundColor:
    'rgba(15, 23, 42, 0.45)',
},

filterModalContainer: {
  maxHeight: '84%',
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  backgroundColor: Colors.white,
},

filterModalHeader: {
  paddingHorizontal: 20,
  paddingTop: 20,
  paddingBottom: 15,
  borderBottomWidth: 1,
  borderBottomColor: Colors.border,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent:
    'space-between',
},

filterModalTitle: {
  fontSize: 18,
  fontWeight: '800',
  color: Colors.textPrimary,
},

filterModalSubtitle: {
  marginTop: 3,
  fontSize: 11,
  color: Colors.textSecondary,
},

filterCloseButton: {
  width: 38,
  height: 38,
  borderRadius: 19,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor:
    Colors.surfaceSecondary,
},

filterModalContent: {
  padding: 20,
  paddingBottom: 24,
},

filterFieldGroup: {
  marginBottom: 20,
},

filterLabel: {
  marginBottom: 8,
  fontSize: 12,
  fontWeight: '700',
  color: Colors.textPrimary,
},

filterInput: {
  minHeight: 50,
  paddingHorizontal: 13,
  borderWidth: 1,
  borderColor: Colors.border,
  borderRadius: 12,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 9,
},

readonlyFilterInput: {
  backgroundColor:
    Colors.surfaceSecondary,
},

readonlyFilterText: {
  flex: 1,
  fontSize: 13,
  fontWeight: '600',
  color: Colors.textPrimary,
},

statusOptionGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
},

statusOption: {
  width: '31%',
  minHeight: 39,
  paddingHorizontal: 7,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: Colors.border,
  borderRadius: 10,
  backgroundColor: Colors.white,
},

statusOptionSelected: {
  borderColor: Colors.primary,
  backgroundColor:
    Colors.primaryLight,
},

statusOptionText: {
  fontSize: 11,
  fontWeight: '600',
  color: Colors.textSecondary,
},

statusOptionTextSelected: {
  color: Colors.primary,
  fontWeight: '800',
},

dateFieldHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent:
    'space-between',
},

clearDateText: {
  fontSize: 11,
  fontWeight: '700',
  color: Colors.danger,
},

dateFieldsRow: {
  flexDirection: 'row',
  gap: 10,
},

dateFieldColumn: {
  flex: 1,
},

dateInputLabel: {
  marginBottom: 6,
  fontSize: 10,
  fontWeight: '600',
  color: Colors.textSecondary,
},

filterDateInput: {
  minHeight: 48,
  paddingHorizontal: 10,
  borderWidth: 1,
  borderColor: Colors.border,
  borderRadius: 11,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 7,
},

filterDateText: {
  flex: 1,
  fontSize: 11,
  fontWeight: '600',
  color: Colors.textPrimary,
},

filterPlaceholderText: {
  color: Colors.textSecondary,
},

dateInformationCard: {
  marginTop: 14,
  padding: 11,
  borderRadius: 10,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  backgroundColor:
    Colors.infoLight,
},

dateInformationText: {
  flex: 1,
  fontSize: 10,
  lineHeight: 15,
  color: Colors.info,
},

dateRequiredCard: {
  marginTop: 14,
  padding: 11,
  borderRadius: 10,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  backgroundColor:
    Colors.warningLight,
},

dateRequiredText: {
  flex: 1,
  fontSize: 10,
  lineHeight: 15,
  color: Colors.warning,
},

filterModalFooter: {
  paddingHorizontal: 20,
  paddingTop: 12,
  paddingBottom: 20,
  borderTopWidth: 1,
  borderTopColor: Colors.border,
  flexDirection: 'row',
  gap: 12,
},

filterResetButton: {
  flex: 1,
  minHeight: 48,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: Colors.border,
  borderRadius: 12,
},

filterResetButtonText: {
  fontSize: 13,
  fontWeight: '700',
  color: Colors.textPrimary,
},

filterApplyButton: {
  flex: 1.5,
  minHeight: 48,
  borderRadius: 12,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  backgroundColor: Colors.primary,
},

filterApplyButtonText: {
  fontSize: 13,
  fontWeight: '800',
  color: Colors.white,
  },



summaryHeaderContent: {
  flex: 1,
  paddingRight: 12,
},

paymentSummaryHeader: {
  width: '100%',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 12,
},

paymentSummaryTitleArea: {
  flex: 1,
  paddingRight: 12,
},

paymentSummaryFilterText: {
  marginTop: 2,
  fontSize: 10,
  fontWeight: '500',
  color: Colors.textSecondary,
},

});