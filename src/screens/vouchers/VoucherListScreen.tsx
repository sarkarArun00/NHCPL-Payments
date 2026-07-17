import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  MaterialDesignIcons,
} from '@react-native-vector-icons/material-design-icons/static';
import {
  CommonActions,
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {Colors} from '../../constants/colors';
import {useAuthStore} from '../../store/authStore';
import {useVoucherStore} from '../../store/voucherStore';
import {
  ExpenseStatus,
  ExpenseVoucher,
} from '../../types/voucher.types';
import { RootStackParamList } from '../../navigation/navigationTypes';
import { useCenterStore } from '../../store/centerStore';

import DateTimePicker from '@react-native-community/datetimepicker';

import type {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import {
  expenseApi,
  ExpenseCategoryCount,
} from '../../api/expense.api';
import { approvalApi } from '../../api/approval.api';
import VoucherTypeModal from '../../components/VoucherTypeModal';





type NavigationProp =
  NativeStackNavigationProp<RootStackParamList>;
  
  type VoucherListRouteParams = {
  initialStatus?: ExpenseStatus;
};

type VoucherListRouteProp = RouteProp<
  {
    Vouchers:
      | VoucherListRouteParams
      | undefined;
  },
  'Vouchers'
  >;

  type NormalizedApprovalLevel = {
  approvalLevel: number;
  approverRoleId: number;
  approved: boolean;
  isDirector: boolean;
};

type StatusFilter = {
  label: string;
  value: ExpenseStatus;
};

const allStatusFilters: StatusFilter[] = [
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
];



const DATE_MANDATORY_STATUSES:
  ExpenseStatus[] = [
    'APPROVED',
    'REJECTED',
    'SETTLED',
  ];

const formatLocalDate = (
  date: Date,
): string => {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0');

  const day = String(
    date.getDate(),
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const parseLocalDate = (
  value: string,
): Date => {
  const parts = value
    .split('-')
    .map(Number);

  if (parts.length !== 3) {
    return new Date();
  }

  const [
    year,
    month,
    day,
  ] = parts;

  const parsedDate = new Date(
    year,
    month - 1,
    day,
  );

  const isValid =
    parsedDate.getFullYear() === year &&
    parsedDate.getMonth() ===
      month - 1 &&
    parsedDate.getDate() === day;

  return isValid
    ? parsedDate
    : new Date();
};


const getTodayDate = (): string => {
  return formatLocalDate(new Date());
};

const isDateMandatoryForStatus = (
  status: ExpenseStatus,
): boolean => {
  return DATE_MANDATORY_STATUSES.includes(
    status,
  );
};

  type ActiveDateField =
  | 'FROM'
  | 'TO'
    | null;
  
    const isValidDateFormat = (
  value: string,
): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value
    .split('-')
    .map(Number);

  const date = new Date(
    year,
    month - 1,
    day,
  );

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
    };


export default function VoucherListScreen() {
   const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NavigationProp>();
  
  const route =
  useRoute<VoucherListRouteProp>();

  const session = useAuthStore(
    state => state.session,
  );

const employeeData =
  session?.employee as any;

const rawUserType =
  employeeData?.user_type;


    const approverId = Number(
  session?.employee?.id ??
    0,
    );
  
  const selectedCenterId = useCenterStore(
  state => state.selectedCenterId,
  );
  




const [
  activeDateField,
  setActiveDateField,
] = useState<ActiveDateField>(
  null,
  );
  
const {
  vouchers,
  isLoading,
  isRefreshing,
  error,
  loadVouchers,
  setSelectedVoucher,
} = useVoucherStore();

const employeeId = Number(
  session?.employee?.id ?? 0,
);

const centreId = Number(
  selectedCenterId ||
    session?.centreId ||
    0,
);
  
const [
  isBulkApproving,
  setIsBulkApproving,
] = useState(false);

const userTypeName = String(
  session?.employee?.userTypeName ??
    '',
).trim();

  const normalizedUserType =
    userTypeName.trim().toLowerCase();

  const isAdminOrDirector = [
    'admin',
    'director',
    'super admin',
  ].includes(normalizedUserType);

  const defaultStatus: ExpenseStatus =
  isAdminOrDirector
    ? 'PENDING'
    : 'CREATED';

  const [search, setSearch] =
    useState('');

  const [
  categoryCounts,
  setCategoryCounts,
] = useState<
  ExpenseCategoryCount[]
>([]);

const [
  isCategoryCountLoading,
  setIsCategoryCountLoading,
] = useState(false);

const [
  categoryCountError,
  setCategoryCountError,
] = useState('');
  
  const [
    selectedCategoryId,
    setSelectedCategoryId,
  ] = useState<number | null>(null);

const [
  selectedStatus,
  setSelectedStatus,
] = useState<ExpenseStatus>(
  defaultStatus,
  );
  
  const [
  draftStatus,
  setDraftStatus,
] = useState<ExpenseStatus>(
  defaultStatus,
);

    const [
  fromDate,
  setFromDate,
] = useState('');

const [
  toDate,
  setToDate,
] = useState('');
  
  const [
  isFilterModalVisible,
  setIsFilterModalVisible,
] = useState(false);

const [
  draftFromDate,
  setDraftFromDate,
] = useState('');

const [
  draftToDate,
  setDraftToDate,
] = useState('');
  
// Pending bulk approval:
// stores approvalRequest.id
const [
  selectedVoucherIds,
  setSelectedVoucherIds,
] = useState<Set<number>>(
  () => new Set<number>(),
);

  
  const [
  isBulkSendingSalaryApproval,
  setIsBulkSendingSalaryApproval,
  ] = useState(false);
  

// Created Salary:
// stores expense.id
const [
  selectedCreatedSalaryIds,
  setSelectedCreatedSalaryIds,
] = useState<Set<number>>(
  () => new Set<number>(),
);
  
  
  const [
  voucherTypeModalVisible,
  setVoucherTypeModalVisible,
  ] = useState(false);
  

  const statusFilters = useMemo(() => {
    if (isAdminOrDirector) {
      return allStatusFilters.filter(
        item => item.value !== 'CREATED',
      );
    }

    return allStatusFilters;
  }, [isAdminOrDirector]);

  const handleStatusChange =
  useCallback(
    (
      status: ExpenseStatus,
    ) => {
      const requiresDate =
        isDateMandatoryForStatus(
          status,
        );

      const today =
        getTodayDate();

      /*
       * Clear the previous category because
       * each status returns different categories.
       */
      setSelectedCategoryId(null);

      setSelectedStatus(status);

      setFromDate(
        requiresDate
          ? today
          : '',
      );

      setToDate(
        requiresDate
          ? today
          : '',
      );
    },
    [],
  );
  
useEffect(() => {
  const requestedStatus =
    route.params?.initialStatus;

  if (!requestedStatus) {
    return;
  }

  const allowedStatus =
    isAdminOrDirector &&
    requestedStatus === 'CREATED'
      ? 'PENDING'
      : requestedStatus;

  handleStatusChange(
    allowedStatus,
  );

  navigation.setParams({
    initialStatus: undefined,
  });
}, [
  route.params?.initialStatus,
  isAdminOrDirector,
  handleStatusChange,
  navigation,
]);

  useEffect(() => {
  const requestedStatus =
    route.params?.initialStatus;

  if (!requestedStatus) {
    return;
  }

  const allowedStatus =
    isAdminOrDirector &&
    requestedStatus === 'CREATED'
      ? 'PENDING'
      : requestedStatus;

  handleStatusChange(
    allowedStatus,
  );

  /*
   * Clear the route parameter after using it.
   * This allows the same Dashboard card to
   * trigger navigation again later.
   */
  navigation.setParams({
    initialStatus: undefined,
  });
}, [
  route.params?.initialStatus,
  isAdminOrDirector,
  handleStatusChange,
  navigation,
  ]);
  
  const openDatePicker =
  useCallback(
    (
      field: Exclude<
        ActiveDateField,
        null
      >,
    ) => {
      setActiveDateField(field);
    },
    [],
  );

const closeDatePicker =
  useCallback(() => {
    setActiveDateField(null);
  }, []);

const handleDateChange =
  useCallback(
    (
      event: DateTimePickerEvent,
      selectedDate?: Date,
    ) => {
      /*
       * Android picker must close after
       * selection or cancellation.
       */
      if (
        Platform.OS === 'android'
      ) {
        closeDatePicker();
      }

      if (
        event.type === 'dismissed' ||
        !selectedDate ||
        !activeDateField
      ) {
        return;
      }

      const formattedDate =
        formatLocalDate(
          selectedDate,
        );

      if (
        activeDateField === 'FROM'
      ) {
        setDraftFromDate(
          formattedDate,
        );
      } else {
        setDraftToDate(
          formattedDate,
        );
      }

      if (Platform.OS === 'ios') {
        closeDatePicker();
      }
    },
    [
      activeDateField,
      closeDatePicker,
    ],
  );


  const activePickerDate =
  useMemo(() => {
    if (
      activeDateField === 'FROM'
    ) {
      return parseLocalDate(
        draftFromDate,
      );
    }

    if (
      activeDateField === 'TO'
    ) {
      return parseLocalDate(
        draftToDate,
      );
    }

    return new Date();
  }, [
    activeDateField,
    draftFromDate,
    draftToDate,
  ]);


useEffect(() => {
  if (
    isAdminOrDirector &&
    selectedStatus === 'CREATED'
  ) {
    setSelectedStatus(
      'PENDING',
    );

    setFromDate('');
    setToDate('');
  }
}, [
  isAdminOrDirector,
  selectedStatus,
]);

  const loadVoucherCategoryCounts =
  useCallback(async () => {
    if (
      centreId <= 0 ||
      !userTypeName
    ) {
      setCategoryCounts([]);
      return;
    }

    try {
      setIsCategoryCountLoading(
        true,
      );

      setCategoryCountError('');

      const response =
        await expenseApi
          .getExpenseCategoryCount({
            payment_mode: 'BANK',
            center_id: centreId,
            status: selectedStatus,
            type: userTypeName,
            fromDate: fromDate,
            toDate: toDate,
          });
      
          const dd = {payment_mode: 'BANK',
            center_id: centreId,
            status: selectedStatus,
            type: userTypeName,
            fromDate: fromDate,
            toDate: toDate,}
      console.log('getExpenseCategoryCount payload', dd)

      const normalizedCategories =
        response
          .map(item => ({
            category_id: Number(
              item.category_id || 0,
            ),

            category_name: String(
              item.category_name || '',
            ).trim(),

            expense_count: Number(
              item.expense_count || 0,
            ),
          }))
          .filter(
            item =>
              item.category_id > 0 &&
              Boolean(
                item.category_name,
              ),
          );

      setCategoryCounts(
        normalizedCategories,
      );

      setSelectedCategoryId(
  currentCategoryId => {
    const currentCategoryExists =
      normalizedCategories.some(
        category =>
          category.category_id ===
          currentCategoryId,
      );

    if (currentCategoryExists) {
      return currentCategoryId;
    }

    return (
      normalizedCategories[0]
        ?.category_id ?? null
    );
  },
);
    } catch (apiError: any) {
      console.error(
        'Unable to load voucher category counts:',
        apiError,
      );

      setCategoryCounts([]);

      setSelectedCategoryId(null);

      setCategoryCountError(
        apiError?.response?.data
          ?.message ||
          apiError?.message ||
          'Unable to load expense categories.',
      );
    } finally {
      setIsCategoryCountLoading(
        false,
      );
    }
  }, [
    centreId,
    selectedStatus,
    userTypeName,
  ]);

  const fetchVouchers = useCallback(
  async (refresh = false) => {
    if (
      !employeeId ||
      centreId <= 0 ||
      !selectedCategoryId
    ) {
      return;
    }

    const request: {
      user_id: number;
      center_id: number;
      category_id: number;
      status: ExpenseStatus;
      payment_mode: 'BANK';
      // page: number;
      // limit: number;
      fromDate?: string;
      toDate?: string;
    } = {
      user_id: Number(employeeId),
      center_id: centreId,
      category_id:
        selectedCategoryId,
      status: selectedStatus,
      payment_mode: 'BANK',
      // page: 1,
      // limit: 20,
    };

    if (fromDate) {
      request.fromDate =
        fromDate;
    }

    if (toDate) {
      request.toDate =
        toDate;
    }

    await loadVouchers(
      request,
      refresh,
    );
  },
  [
    employeeId,
    centreId,
    selectedCategoryId,
    selectedStatus,
    fromDate,
    toDate,
    loadVouchers,
  ],
  );
  


  useEffect(() => {
    if (!selectedCategoryId) {
      return;
    }

    fetchVouchers(false);
  }, [
    selectedCategoryId,
    selectedStatus,
    fetchVouchers,
  ]);

const selectedCategory =
  useMemo(() => {
    return categoryCounts.find(
      category =>
        category.category_id ===
        selectedCategoryId,
    );
  }, [
    categoryCounts,
    selectedCategoryId,
  ]);
  

  const isSelectedCategorySalary =
  useMemo(() => {
    return (
      String(
        selectedCategory?.category_name ||
          '',
      )
        .trim()
        .toUpperCase() === 'SALARY'
    );
  }, [
    selectedCategory?.category_name,
  ]);

  const getVoucherId = useCallback(
  (
    voucher: ExpenseVoucher,
  ): number => {
    const rawVoucher =
      (voucher?.raw as any) ?? {};

    return Number(
      voucher?.id ??
        rawVoucher?.id ??
        0,
    );
  },
  [],
  );

  const isCreatedSalaryEligible =
  useCallback(
    (
      voucher: ExpenseVoucher,
    ): boolean => {
      const rawVoucher =
        (voucher?.raw as any) ?? {};

      const voucherStatus =
        String(
          voucher?.status ??
            rawVoucher?.status ??
            '',
        )
          .trim()
          .toUpperCase();

      const expenseId =
        getVoucherId(voucher);

      return (
        selectedStatus ===
          'CREATED' &&
        isSelectedCategorySalary &&
        voucherStatus ===
          'CREATED' &&
        expenseId > 0
      );
    },
    [
      selectedStatus,
      isSelectedCategorySalary,
      getVoucherId,
    ],
  );

  const eligibleCreatedSalaryIds =
  useMemo<number[]>(() => {
    const expenseIds = vouchers
      .filter(isCreatedSalaryEligible)
      .map(getVoucherId)
      .filter(id => id > 0);

    return Array.from(
      new Set(expenseIds),
    );
  }, [
    vouchers,
    isCreatedSalaryEligible,
    getVoucherId,
  ]);

const allCreatedSalarySelected =
  eligibleCreatedSalaryIds.length > 0 &&
  eligibleCreatedSalaryIds.every(id =>
    selectedCreatedSalaryIds.has(id),
  );


  const handleSelectAllCreatedSalary =
  useCallback(() => {
    if (
      allCreatedSalarySelected
    ) {
      setSelectedCreatedSalaryIds(
        new Set<number>(),
      );

      return;
    }

    setSelectedCreatedSalaryIds(
      new Set(
        eligibleCreatedSalaryIds,
      ),
    );
  }, [
    allCreatedSalarySelected,
    eligibleCreatedSalaryIds,
  ]);



  const toggleCreatedSalarySelection =
  useCallback(
    (voucher: ExpenseVoucher) => {
      if (
        !isCreatedSalaryEligible(
          voucher,
        )
      ) {
        return;
      }

      const expenseId =
        getVoucherId(voucher);

      if (expenseId <= 0) {
        return;
      }

      setSelectedCreatedSalaryIds(
        currentIds => {
          const updatedIds =
            new Set(currentIds);

          if (
            updatedIds.has(expenseId)
          ) {
            updatedIds.delete(expenseId);
          } else {
            updatedIds.add(expenseId);
          }

          return updatedIds;
        },
      );
    },
    [
      getVoucherId,
      isCreatedSalaryEligible,
    ],
    );



const handleVoucherPress = (
  voucher: ExpenseVoucher,
) => {
  setSelectedVoucher(voucher);

  navigation.dispatch(
    CommonActions.navigate({
      name: 'VoucherDetails',

      params: {
        voucherId: Number(
          voucher.id,
        ),
      },
    }),
  );
};

const renderVoucher = ({
  item,
}: {
  item: ExpenseVoucher;
}) => {
  const canSelectForBulkApproval =
    canBulkApproveVoucher(item);

  const canSelectForSalarySend =
    isCreatedSalaryEligible(item);

  const showSelection =
    canSelectForBulkApproval ||
    canSelectForSalarySend;

  const isSelected =
    canSelectForBulkApproval
      ? isBulkVoucherSelected(item)
      : canSelectForSalarySend
        ? selectedCreatedSalaryIds.has(
            getVoucherId(item),
          )
        : false;

  const handleToggleSelection = () => {
    if (canSelectForBulkApproval) {
      toggleBulkVoucherSelection(
        item,
      );

      return;
    }

    if (canSelectForSalarySend) {
      toggleCreatedSalarySelection(
        item,
      );
    }
  };

  return (
    <VoucherCard
      voucher={item}
      onPress={() =>
        handleVoucherPress(item)
      }
      showSelection={
        showSelection
      }
      isSelected={
        isSelected
      }
      onToggleSelection={
        handleToggleSelection
      }
    />
  );
};

const openFilterModal =
  useCallback(() => {
    setDraftStatus(
      selectedStatus,
    );

    setDraftFromDate(
      fromDate,
    );

    setDraftToDate(
      toDate,
    );

    setIsFilterModalVisible(
      true,
    );
  }, [
    selectedStatus,
    fromDate,
    toDate,
  ]);

  const closeFilterModal =
  useCallback(() => {
    setIsFilterModalVisible(false);
    setActiveDateField(null);
  }, []);

  const handleDraftStatusChange =
  useCallback(
    (
      status: ExpenseStatus,
    ) => {
      const requiresDate =
        isDateMandatoryForStatus(
          status,
        );

      const today =
        getTodayDate();

      setDraftStatus(status);

      setDraftFromDate(
        currentDate =>
          requiresDate
            ? currentDate || today
            : '',
      );

      setDraftToDate(
        currentDate =>
          requiresDate
            ? currentDate || today
            : '',
      );
    },
    [],
  );

    useEffect(() => {
  loadVoucherCategoryCounts();
    }, [loadVoucherCategoryCounts]);
  
const handleApplyFilter =
  useCallback(() => {
    const requiresDate =
      isDateMandatoryForStatus(
        draftStatus,
      );

    const normalizedFromDate =
      draftFromDate.trim();

    const normalizedToDate =
      draftToDate.trim();

    if (
      requiresDate &&
      (!normalizedFromDate ||
        !normalizedToDate)
    ) {
      Alert.alert(
        'Date required',
        'From Date and To Date are required for this status.',
      );

      return;
    }

    if (
      normalizedFromDate &&
      !isValidDateFormat(
        normalizedFromDate,
      )
    ) {
      Alert.alert(
        'Invalid From Date',
        'Please select a valid From Date.',
      );

      return;
    }

    if (
      normalizedToDate &&
      !isValidDateFormat(
        normalizedToDate,
      )
    ) {
      Alert.alert(
        'Invalid To Date',
        'Please select a valid To Date.',
      );

      return;
    }

    if (
      normalizedFromDate &&
      normalizedToDate &&
      normalizedFromDate >
        normalizedToDate
    ) {
      Alert.alert(
        'Invalid date range',
        'To Date cannot be earlier than From Date.',
      );

      return;
    }

    const filterChanged =
      draftStatus !== selectedStatus ||
      normalizedFromDate !== fromDate ||
      normalizedToDate !== toDate;

    if (filterChanged) {
      /*
      * Hide categories and vouchers from
      * the previously applied filter while
      * the new category API is loading.
      */
      setCategoryCounts([]);
      setSelectedCategoryId(null);
    }

    setSelectedStatus(
      draftStatus,
    );

    setFromDate(
      normalizedFromDate,
    );

    setToDate(
      normalizedToDate,
    );

    setIsFilterModalVisible(
      false,
    );
}, [
  draftStatus,
  selectedStatus,
  draftFromDate,
  draftToDate,
  fromDate,
  toDate,
]);

  const handleResetFilter =
  useCallback(() => {
    const resetStatus =
      defaultStatus;

    setDraftStatus(
      resetStatus,
    );

    setDraftFromDate('');
    setDraftToDate('');

    setSelectedCategoryId(null);
    setSelectedStatus(
      resetStatus,
    );

    setFromDate('');
    setToDate('');

    setIsFilterModalVisible(
      false,
    );
  }, [defaultStatus]);

  const filteredVouchers =
  useMemo(() => {
    /*
    * No valid category exists for the
    * selected status, so no voucher from
    * the previous filter may be shown.
    */
    if (
      !selectedCategoryId ||
      !selectedCategory
    ) {
      return [];
    }

    const normalizedStatus =
      String(selectedStatus)
        .trim()
        .toUpperCase();

    const normalizedCategoryName =
      String(
        selectedCategory.category_name ??
          '',
      )
        .trim()
        .toLowerCase();

    const normalizedSearch =
      search.trim().toLowerCase();

    return vouchers.filter(voucher => {
      const rawVoucher =
        (voucher?.raw as any) ?? {};

      const voucherStatus =
        String(
          voucher.status ??
            rawVoucher.status ??
            '',
        )
          .trim()
          .toUpperCase();

      if (
        voucherStatus !==
        normalizedStatus
      ) {
        return false;
      }

      const voucherCategoryId =
        Number(
          rawVoucher.category_id ??
            rawVoucher
              .expense_category_id ??
            rawVoucher.categoryId ??
            rawVoucher
              .expenseCategoryId ??
            rawVoucher.category?.id ??
            rawVoucher
              .expenseCategory?.id ??
            0,
        );

      const voucherCategoryName =
        String(
          voucher.categoryName ??
            rawVoucher.category_name ??
            rawVoucher
              .expense_category_name ??
            rawVoucher.category
              ?.category_name ??
            rawVoucher.expenseCategory
              ?.category_name ??
            '',
        )
          .trim()
          .toLowerCase();

      const categoryMatches =
        voucherCategoryId > 0
          ? voucherCategoryId ===
            selectedCategoryId
          : voucherCategoryName ===
            normalizedCategoryName;

      if (!categoryMatches) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        voucher.voucherNo,
        voucher.beneficiaryName,
        voucher.vendorName,
        voucher.categoryName,
        voucher.status,
        voucher.bankName,
      ].some(value =>
        String(value ?? '')
          .toLowerCase()
          .includes(
            normalizedSearch,
          ),
      );
    });
  }, [
    search,
    vouchers,
    selectedStatus,
    selectedCategoryId,
    selectedCategory,
  ]);

  const getApprovalRequestId =
  useCallback(
    (
      voucher: ExpenseVoucher,
    ): number => {
      const rawVoucher =
        (voucher?.raw as any) ?? {};

      return Number(
        rawVoucher?.approvalRequest
          ?.id ??
          rawVoucher?.approval_request
            ?.id ??
          rawVoucher
            ?.approval_request_id ??
          rawVoucher
            ?.approvalRequestId ??
          (voucher as any)
            ?.approval_request_id ??
          0,
      );
    },
    [],
  );

const canBulkApproveVoucher =
  useCallback(
    (
      voucher: ExpenseVoucher,
    ): boolean => {
      const rawVoucher =
        (voucher?.raw as any) ?? {};

      const voucherStatus = String(
        voucher?.status ??
          rawVoucher?.status ??
          '',
      )
        .trim()
        .toUpperCase();

      if (
        voucherStatus !== 'PENDING' ||
        employeeId <= 0
      ) {
        return false;
      }

      const approvalRequest =
        rawVoucher?.approvalRequest ??
        rawVoucher?.approval_request ??
        null;

      const approvalRequestId =
        getApprovalRequestId(
          voucher,
        );

      if (approvalRequestId <= 0) {
        return false;
      }

      const approvalLevels =
        Array.isArray(
          rawVoucher?.approval_levels,
        )
          ? rawVoucher.approval_levels
          : Array.isArray(
                (voucher as any)
                  ?.approval_levels,
              )
            ? (voucher as any)
                .approval_levels
            : [];

      if (
        approvalLevels.length === 0
      ) {
        return false;
      }

      const requestCurrentLevel =
        Number(
          approvalRequest
            ?.currentLevel ??
            approvalRequest
              ?.current_level ??
            rawVoucher
              ?.currentApprovalLevel ??
            rawVoucher
              ?.current_approval_level ??
            0,
        );

      /*
       * Fallback when currentLevel is not
       * present in list API response.
       */
      const pendingLevelNumbers =
        approvalLevels
          .filter((level: any) => {
            const approved =
              level?.approved === true ||
              level?.approved === 1 ||
              level?.approved === '1';

            return !approved;
          })
          .map((level: any) =>
            Number(
              level?.approvalLevel ??
                level?.approval_level ??
                level?.level ??
                0,
            ),
          )
          .filter(
            (level: number) =>
              level > 0,
          );

      const activeApprovalLevel =
        requestCurrentLevel > 0
          ? requestCurrentLevel
          : pendingLevelNumbers.length >
              0
            ? Math.min(
                ...pendingLevelNumbers,
              )
            : 0;

      if (
        activeApprovalLevel <= 0
      ) {
        return false;
      }

      return approvalLevels.some(
        (level: any) => {
          const approvalLevel =
            Number(
              level?.approvalLevel ??
                level?.approval_level ??
                level?.level ??
                0,
            );

          /*
           * In your API approverRoleId
           * contains the employee ID.
           */
          const approverEmployeeId =
            Number(
              level?.approverRoleId ??
                level?.approver_role_id ??
                level?.approverId ??
                level?.approver_id ??
                0,
            );

          const approved =
            level?.approved === true ||
            level?.approved === 1 ||
            level?.approved === '1';

          return (
            approverEmployeeId ===
              employeeId &&
            approvalLevel ===
              activeApprovalLevel &&
            !approved
          );
        },
      );
    },
    [
      employeeId,
      getApprovalRequestId,
    ],
  );

const isBulkVoucherSelected =
  useCallback(
    (
      voucher: ExpenseVoucher,
    ): boolean => {
      const approvalRequestId =
        getApprovalRequestId(
          voucher,
        );

      return (
        approvalRequestId > 0 &&
        selectedVoucherIds.has(
          approvalRequestId,
        )
      );
    },
    [
      getApprovalRequestId,
      selectedVoucherIds,
    ],
  );

const toggleBulkVoucherSelection =
  useCallback(
    (
      voucher: ExpenseVoucher,
    ) => {
      if (
        !canBulkApproveVoucher(
          voucher,
        )
      ) {
        return;
      }

      const approvalRequestId =
        getApprovalRequestId(
          voucher,
        );

      if (approvalRequestId <= 0) {
        return;
      }

      setSelectedVoucherIds(
        currentIds => {
          const updatedIds =
            new Set(currentIds);

          if (
            updatedIds.has(
              approvalRequestId,
            )
          ) {
            updatedIds.delete(
              approvalRequestId,
            );
          } else {
            updatedIds.add(
              approvalRequestId,
            );
          }

          return updatedIds;
        },
      );
    },
    [
      canBulkApproveVoucher,
      getApprovalRequestId,
    ],
  );

const eligibleVoucherIds =
  useMemo<number[]>(() => {
    const approvalRequestIds =
      filteredVouchers
        .filter(voucher =>
          canBulkApproveVoucher(
            voucher,
          ),
        )
        .map(voucher =>
          getApprovalRequestId(
            voucher,
          ),
        )
        .filter(
          approvalRequestId =>
            approvalRequestId > 0,
        );

    return Array.from(
      new Set(
        approvalRequestIds,
      ),
    );
  }, [
    filteredVouchers,
    canBulkApproveVoucher,
    getApprovalRequestId,
  ]);

  useEffect(() => {
  setSelectedVoucherIds(
    currentIds => {
      const eligibleIdSet =
        new Set(
          eligibleVoucherIds,
        );

      const validSelectedIds =
        Array.from(
          currentIds,
        ).filter(id =>
          eligibleIdSet.has(id),
        );

      const hasChanged =
        validSelectedIds.length !==
        currentIds.size;

      if (!hasChanged) {
        return currentIds;
      }

      return new Set<number>(
        validSelectedIds,
      );
    },
  );
  }, [eligibleVoucherIds]);
  
const allEligibleSelected =
  eligibleVoucherIds.length > 0 &&
  eligibleVoucherIds.every(
    approvalRequestId =>
      selectedVoucherIds.has(
        approvalRequestId,
      ),
  );

  const clearVoucherSelection =
  useCallback(() => {
    setSelectedVoucherIds(
      new Set<number>(),
    );
  }, []);

  const clearCreatedSalarySelection =
  useCallback(() => {
    setSelectedCreatedSalaryIds(
      new Set<number>(),
    );
  }, []);

  const clearAllVoucherSelections =
  useCallback(() => {
    setSelectedVoucherIds(
      new Set<number>(),
    );

    setSelectedCreatedSalaryIds(
      new Set<number>(),
    );
  }, []);

  const totalSelectedCount =
  selectedVoucherIds.size +
  selectedCreatedSalaryIds.size;

const handleSelectAllEligible =
  useCallback(() => {
    if (
      eligibleVoucherIds.length === 0
    ) {
      return;
    }

    if (allEligibleSelected) {
      setSelectedVoucherIds(
        new Set<number>(),
      );

      return;
    }

    setSelectedVoucherIds(
      new Set<number>(
        eligibleVoucherIds,
      ),
    );
  }, [
    allEligibleSelected,
    eligibleVoucherIds,
  ]);

  const handleCategoryChange =
  useCallback(
    (
      nextCategoryId: number,
    ) => {
      if (
        nextCategoryId ===
        selectedCategoryId
      ) {
        return;
      }

      const changeCategory = () => {
        clearAllVoucherSelections();

        setSelectedCategoryId(
          nextCategoryId,
        );
      };

      /*
       * No selection exists:
       * change category directly.
       */
      if (
        totalSelectedCount === 0
      ) {
        changeCategory();
        return;
      }

      /*
       * A Pending or Created Salary
       * voucher is selected.
       */
      Alert.alert(
        'Change category?',
        `${totalSelectedCount} selected ${
          totalSelectedCount === 1
            ? 'voucher'
            : 'vouchers'
        } will be unselected.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Change',
            style: 'destructive',
            onPress:
              changeCategory,
          },
        ],
      );
    },
    [
      selectedCategoryId,
      totalSelectedCount,
      clearAllVoucherSelections,
    ],
    );
  

  
const handleBulkApprovePress =
  useCallback(() => {
    const approvalRequestIds =
      Array.from(
        selectedVoucherIds,
      );

    if (
      approvalRequestIds.length === 0
    ) {
      return;
    }

    if (approverId <= 0) {
      Alert.alert(
        'Unable to approve',
        'Approver information is not available.',
      );

      return;
    }

    if (
      !selectedCategoryId ||
      selectedCategoryId <= 0
    ) {
      Alert.alert(
        'Unable to approve',
        'Please select an expense category.',
      );

      return;
    }

    Alert.alert(
      'Approve vouchers?',
      `Are you sure you want to approve ${
        approvalRequestIds.length
      } ${
        approvalRequestIds.length === 1
          ? 'voucher'
          : 'vouchers'
      }?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              setIsBulkApproving(true);
              // return
              const response =
                await approvalApi
                  .bulkExpenseDecision({
                    approvalRequestIds,
                    approverId,
                    decision:'APPROVED',
                    expense_category_id:
                      selectedCategoryId,
                    remarks: true,
                  });

              if (
                Number(
                  response?.status,
                ) !== 1
              ) {
                throw new Error(
                  response?.message ||
                    'Unable to approve selected vouchers.',
                );
              }

              clearVoucherSelection();

              await Promise.allSettled([
                loadVoucherCategoryCounts(),
                fetchVouchers(true),
              ]);

              Alert.alert(
                'Approved',
                response?.message ||
                  `${
                    approvalRequestIds.length
                  } vouchers approved successfully.`,
              );

            } catch (error: any) {
              console.error(
                'Bulk approval failed:',
                error,
              );

              Alert.alert(
                'Approval failed',
                error?.response?.data
                  ?.message ||
                  error?.message ||
                  'Unable to approve selected vouchers.',
              );
            } finally {
              setIsBulkApproving(false);
            }
          },
        },
      ],
    );
  }, [
    selectedVoucherIds,
    approverId,
    selectedCategoryId,
    clearVoucherSelection,
    loadVoucherCategoryCounts,
    fetchVouchers,
  ]);

const totalVoucherAmount =
  useMemo(() => {
    return filteredVouchers.reduce(
      (
        total: number,
        voucher: ExpenseVoucher,
      ) => {
        const rawVoucher =
          (voucher?.raw as any) ?? {};

        const amount = Number(
          String(
            voucher?.netPayable ??
              rawVoucher?.net_payable ??
              rawVoucher?.gross_amount ??
              0,
          )
            .replace(/,/g, '')
            .trim(),
        );

        return (
          total +
          (Number.isFinite(amount)
            ? amount
            : 0)
        );
      },
      0,
    );
  }, [filteredVouchers]);

  const hasActiveFilter =
  selectedStatus !==
    defaultStatus ||
    Boolean(fromDate || toDate);
  
  const handleRefresh =
  useCallback(async () => {
    await Promise.allSettled([
      loadVoucherCategoryCounts(),
      fetchVouchers(true),
    ]);
  }, [
    loadVoucherCategoryCounts,
    fetchVouchers,
  ]);

  useFocusEffect(
  useCallback(() => {
    if (centreId <= 0) {
      return;
    }

    loadVoucherCategoryCounts(),
    void fetchVouchers(true)

    return undefined;
  }, [
    centreId,
    fetchVouchers,
    loadVoucherCategoryCounts
  ]),
);

  const handleBulkSendSalaryForApproval =
  useCallback(() => {
    const expenseIds = Array.from(
      selectedCreatedSalaryIds,
    );

    if (
      expenseIds.length === 0
    ) {
      Alert.alert(
        'No expense selected',
        'Please select at least one created salary expense.',
      );

      return;
    }

    if (
      !isSelectedCategorySalary
    ) {
      Alert.alert(
        'Invalid category',
        'Bulk send for approval is available only for the Salary category.',
      );

      return;
    }

    Alert.alert(
      'Send for approval?',
      `Do you want to send ${
        expenseIds.length
      } ${
        expenseIds.length === 1
          ? 'salary expense'
          : 'salary expenses'
      } for approval?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Yes, Send',
          onPress: async () => {
            try {
              setIsBulkSendingSalaryApproval(
                true,
              );

              const response =
                await expenseApi
                  .bulkSendExpenseForApproval({
                    ids: expenseIds,
                    status: 'PENDING',
                  });

              const isSuccess =
                Number(
                  response?.status,
                ) === 1 ||
                response?.success ===
                  true;

              if (!isSuccess) {
                throw new Error(
                  response?.message ||
                    'Unable to send selected salary expenses for approval.',
                );
              }

              clearCreatedSalarySelection();

              await Promise.allSettled([
                loadVoucherCategoryCounts(),
                fetchVouchers(true),
              ]);

              Alert.alert(
                'Success',
                response?.message ||
                  `${expenseIds.length} salary ${
                    expenseIds.length ===
                    1
                      ? 'expense was'
                      : 'expenses were'
                  } sent for approval successfully.`,
              );
            } catch (error: any) {
              console.error(
                'Bulk salary send failed:',
                error,
              );

              Alert.alert(
                'Unable to send',
                error?.response?.data
                  ?.message ||
                  error?.message ||
                  'Something went wrong while sending salary expenses for approval.',
              );
            } finally {
              setIsBulkSendingSalaryApproval(
                false,
              );
            }
          },
        },
      ],
    );
  }, [
    selectedCreatedSalaryIds,
    isSelectedCategorySalary,
    clearCreatedSalarySelection,
    loadVoucherCategoryCounts,
    fetchVouchers,
  ]);


useEffect(() => {
  clearAllVoucherSelections();
}, [
  centreId,
  selectedStatus,
  fromDate,
  toDate,
  clearAllVoucherSelections,
]);

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            Payment Vouchers
          </Text>

          <Text style={styles.headerSubtitle}>
            Manage category-wise payment vouchers
          </Text>
        </View>

        <Pressable
          style={({pressed}) => [
            styles.addButton,
            pressed &&
              styles.buttonPressed,
          ]}
          onPress={() =>
            setVoucherTypeModalVisible(true)
          }>
          <MaterialDesignIcons
            name="plus"
            size={25}
            color={Colors.white}
          />
        </Pressable>
      </View>

      <View style={styles.searchRow}>
  <View style={styles.searchContainer}>
    <MaterialDesignIcons
      name="magnify"
      size={22}
      color={Colors.textMuted}
    />

    <TextInput
      value={search}
      onChangeText={setSearch}
      placeholder="Search voucher or beneficiary"
      placeholderTextColor={Colors.textMuted}
      autoCorrect={false}
      style={styles.searchInput}
    />

    {search.length > 0 ? (
      <Pressable
        hitSlop={10}
        onPress={() => setSearch('')}>
        <MaterialDesignIcons
          name="close-circle"
          size={20}
          color={Colors.textMuted}
        />
      </Pressable>
    ) : null}
  </View>

  <Pressable
    style={({pressed}) => [
      styles.filterButton,
      pressed && styles.buttonPressed,
    ]}
    onPress={openFilterModal}>
    <MaterialDesignIcons
      name="filter-variant"
      size={24}
      color={Colors.white}
    />

{hasActiveFilter ? (
  <View
    style={styles.filterActiveDot}
  />
) : null}
  </Pressable>
</View>


    <View style={styles.categorySection}>
  <View style={styles.sectionHeader}>
    <View style={styles.sectionHeaderContent}>
      <Text style={styles.sectionTitle}>
        Expense Categories
      </Text> 

      <Text style={styles.sectionSubtitle}>
        Select a category to view its vouchers
      </Text>
    </View>

    {isCategoryCountLoading ? (
      <ActivityIndicator
        size="small"
        color={Colors.primary}
      />
    ) : null}
  </View>

  {categoryCountError ? (
    <View style={styles.categoryErrorCard}>
      <MaterialDesignIcons
        name="alert-circle-outline"
        size={18}
        color={Colors.danger}
      />

      <Text style={styles.categoryErrorText}>
        {categoryCountError}
      </Text>

      <Pressable
        disabled={isCategoryCountLoading}
        onPress={() => {
          void loadVoucherCategoryCounts();
        }}>
        <Text style={styles.retryLink}>
          Retry
        </Text>
      </Pressable>
    </View>
  ) : null}

  {!categoryCountError &&
  !isCategoryCountLoading &&
  categoryCounts.length === 0 ? (
    <View style={styles.noCategoryCard}>
      <MaterialDesignIcons
        name="folder-alert-outline"
        size={24}
        color={Colors.textMuted}
      />

      <Text style={styles.noCategoryText}>
        No categories found for the selected status.
      </Text>
    </View>
  ) : null}

  {!categoryCountError &&
  categoryCounts.length > 0 ? (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={
        styles.categoryListContent
      }>
      {categoryCounts.map(category => {
        const isSelected =
          selectedCategoryId ===
          category.category_id;

        return (
          <Pressable
            key={category.category_id}
            onPress={() =>
            handleCategoryChange(
              category.category_id,
            )
          }
            style={({pressed}) => [
              styles.categoryCard,

              isSelected &&
                styles.categoryCardActive,

              pressed &&
                styles.buttonPressed,
            ]}>
            <View
              style={[
                styles.categoryIconBox,

                isSelected &&
                  styles.categoryIconBoxActive,
              ]}>
              <MaterialDesignIcons
                name="folder-outline"
                size={20}
                color={
                  isSelected
                    ? Colors.white
                    : Colors.primary
                }
              />
            </View>

            <View style={styles.categoryTextArea}>
              <Text
                numberOfLines={1}
                style={[
                  styles.categoryName,

                  isSelected &&
                    styles.categoryNameActive,
                ]}>
                {category.category_name}
              </Text>

              <Text
                style={[
                  styles.categoryCount,

                  isSelected &&
                    styles.categoryCountActive,
                ]}>
                {category.expense_count}{' '}
                {category.expense_count === 1
                  ? 'voucher'
                  : 'vouchers'}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  ) : null}
</View>

  {/* <View style={styles.statusSection}>
    <View style={styles.sectionHeader}>
      <View>
        <Text style={styles.sectionTitle}>
          Voucher Status
        </Text>

        <Text style={styles.sectionSubtitle}>
          Filter inside the selected category
        </Text>
      </View>
    </View>

      <FlatList
        horizontal
        data={statusFilters}
        keyExtractor={item =>
          String(item.value)
        }
        contentContainerStyle={
          styles.statusList
        }
        showsHorizontalScrollIndicator={
          false
        }
        renderItem={({item}) => {
          const isSelected =
            selectedStatus ===
            item.value;

          return (
            <Pressable
              onPress={() =>
                handleStatusChange(
                  item.value,
                )
              }
              style={({pressed}) => [
                styles.statusChip,

                isSelected &&
                  styles.statusChipSelected,

                pressed &&
                  styles.buttonPressed,
              ]}>
              <Text
                style={[
                  styles.statusChipText,

                  isSelected &&
                    styles
                      .statusChipTextSelected,
                ]}>
                {item.label}
              </Text>
            </Pressable>
          );
        }}
      />
  </View> */}

{selectedCategory ? (
  <View style={styles.resultHeader}>
        <View>
          <Text style={styles.resultTitle}>
            {selectedCategory?.category_name ||
              'Payment Vouchers'}
          </Text>

          {/* <Text style={styles.resultSubtitle}>
            {selectedStatus} ·{' '}
            {totalRecords ||
              filteredVouchers.length}{' '}
            record
            {(totalRecords ||
              filteredVouchers.length) ===
            1
              ? ''
              : 's'}
          </Text> */}
          <View>
  <Text
    style={
      styles.selectedCategoryMeta
    }>
  {selectedStatus} ·{' '}
  {filteredVouchers.length}{' '}
  {filteredVouchers.length === 1
    ? 'Record'
    : 'Records'}
  </Text>

  <Text
    style={
      styles.selectedCategoryAmount
    }>
    Total Payments:{' '}
    <Text
      style={
        styles.selectedCategoryAmountValue
      }>
      ₹
      {totalVoucherAmount.toLocaleString(
        'en-IN',
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        },
      )}
    </Text>
  </Text>
</View>
        </View>

        <View style={styles.statusIndicator}>
          <View
            style={[
              styles.statusIndicatorDot,
              {
                backgroundColor:
                  getStatusConfig(
                    selectedStatus,
                  ).color,
              },
            ]}
          />

          <Text
            style={
              styles.statusIndicatorText
            }>
            {
              getStatusConfig(
                selectedStatus,
              ).label
            }
          </Text>
        </View>
</View>
) : null}

{selectedStatus === 'CREATED' &&
    isSelectedCategorySalary &&
    selectedCreatedSalaryIds.size >
  0 ? (
  <View
    style={
      styles.bulkSelectionBar
    }>
    <View
      style={
        styles.bulkSelectionTop
      }>
      <View
        style={
          styles.bulkSelectionInfo
        }>
        <Text
          style={
            styles.bulkSelectionTitle
          }>
          Send salary for approval
        </Text>

        <Text
          style={
            styles.bulkSelectionCount
          }>
          {
            selectedCreatedSalaryIds.size
          }{' '}
          of{' '}
          {
            eligibleCreatedSalaryIds.length
          }{' '}
          selected
        </Text>
      </View>

      <Pressable
        disabled={
          isBulkSendingSalaryApproval
        }
        hitSlop={8}
        onPress={
          clearCreatedSalarySelection
        }>
        <Text
          style={
            styles.bulkClearText
          }>
          Clear
        </Text>
      </Pressable>
    </View>

    <View
      style={
        styles.bulkSelectionActions
      }>
      <Pressable
        disabled={
          isBulkSendingSalaryApproval
        }
        onPress={
          handleSelectAllCreatedSalary
        }
        style={({pressed}) => [
          styles.bulkSelectAllButton,

          pressed &&
            !isBulkSendingSalaryApproval &&
            styles.buttonPressed,
        ]}>
        <MaterialDesignIcons
          name={
            allCreatedSalarySelected
              ? 'checkbox-multiple-blank-outline'
              : 'select-all'
          }
          size={19}
          color={Colors.primary}
        />

        <Text
          style={
            styles.bulkSelectAllText
          }>
          {allCreatedSalarySelected
            ? 'Unselect all'
            : 'Select all'}
        </Text>
      </Pressable>

      <Pressable
        disabled={
          selectedCreatedSalaryIds.size ===
            0 ||
          isBulkSendingSalaryApproval
        }
        onPress={
          handleBulkSendSalaryForApproval
        }
        style={({pressed}) => [
          styles.bulkApproveButton,

          (selectedCreatedSalaryIds.size ===
            0 ||
            isBulkSendingSalaryApproval) &&
            styles
              .bulkApproveButtonDisabled,

          pressed &&
            !isBulkSendingSalaryApproval &&
            styles.buttonPressed,
        ]}>
        {isBulkSendingSalaryApproval ? (
          <ActivityIndicator
            size="small"
            color={Colors.white}
          />
        ) : (
          <MaterialDesignIcons
            name="send-check-outline"
            size={19}
            color={Colors.white}
          />
        )}

        <Text
          style={
            styles.bulkApproveText
          }>
          {isBulkSendingSalaryApproval
            ? 'Sending...'
            : `Send (${selectedCreatedSalaryIds.size})`}
        </Text>
      </Pressable>
    </View>
  </View>
      ) : null}
      
{selectedStatus === 'PENDING' &&
eligibleVoucherIds.length > 0 && selectedVoucherIds.size > 0 ? (
    <View style={styles.bulkSelectionBar}>
      <View
        style={
          styles.bulkSelectionTop
        }>
        <View
          style={
            styles.bulkSelectionInfo
          }>
          <Text
            style={
              styles.bulkSelectionTitle
            }>
            Bulk approval
          </Text>

        <Text
          style={
            styles.bulkSelectionCount
          }>
          {selectedVoucherIds.size}{' '}
          of{' '}
          {eligibleVoucherIds.length}{' '}
          selected
        </Text>
        </View>

        {selectedVoucherIds.size >
        0 ? (
          <Pressable
            hitSlop={8}
            onPress={
              clearVoucherSelection
            }>
            <Text
              style={
                styles.bulkClearText
              }>
              Clear
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View
        style={
          styles.bulkSelectionActions
        }>
        <Pressable
          onPress={
            handleSelectAllEligible
          }
          style={({pressed}) => [
            styles.bulkSelectAllButton,

            pressed &&
              styles.buttonPressed,
          ]}>
          <MaterialDesignIcons
            name={
              allEligibleSelected
                ? 'checkbox-multiple-blank-outline'
                : 'select-all'
            }
            size={19}
            color={Colors.primary}
          />

          <Text
            style={
              styles.bulkSelectAllText
            }>
            {allEligibleSelected
              ? 'Unselect all'
              : 'Select all'}
          </Text>
        </Pressable>

        <Pressable
    disabled={
      selectedVoucherIds.size === 0 ||
      isBulkApproving
    }
    onPress={
      handleBulkApprovePress
    }
    style={({pressed}) => [
      styles.bulkApproveButton,

      (selectedVoucherIds.size ===
        0 ||
        isBulkApproving) &&
        styles
          .bulkApproveButtonDisabled,

      pressed &&
        !isBulkApproving &&
        styles.buttonPressed,
    ]}>
    {isBulkApproving ? (
      <ActivityIndicator
        size="small"
        color={Colors.white}
      />
    ) : (
      <MaterialDesignIcons
        name="check-all"
        size={19}
        color={Colors.white}
      />
    )}

    <Text
      style={
        styles.bulkApproveText
      }>
      {isBulkApproving
        ? 'Approving...'
        : `Approve (${selectedVoucherIds.size})`}
    </Text>
  </Pressable>
      </View>
    </View>
        ) : null}
      
      {isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator
            size="large"
            color={Colors.primary}
          />

          <Text style={styles.stateText}>
            Loading payment vouchers...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.stateContainer}>
          <MaterialDesignIcons
            name="alert-circle-outline"
            size={46}
            color={Colors.danger}
          />

          <Text style={styles.errorTitle}>
            Unable to load vouchers
          </Text>

          <Text style={styles.stateText}>
            {error}
          </Text>

          <Pressable
            style={({pressed}) => [
              styles.retryButton,
              pressed &&
                styles.buttonPressed,
            ]}
            onPress={() =>
              fetchVouchers(false)
            }>
            <Text style={styles.retryText}>
              Try again
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredVouchers}
          keyExtractor={item =>
            String(item.id)
          }
          renderItem={renderVoucher}
          contentContainerStyle={[
            styles.listContent,

            filteredVouchers.length ===
              0 &&
              styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
          refreshControl={
          <RefreshControl
            refreshing={
              isRefreshing ||
              isCategoryCountLoading
            }
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
          }
          ListEmptyComponent={
            <View
              style={
                styles.stateContainer
              }>
              <View style={styles.emptyIcon}>
                <MaterialDesignIcons
                  name="receipt-text-outline"
                  size={42}
                  color={Colors.primary}
                />
              </View>

              <Text style={styles.emptyTitle}>
                No payment vouchers found
              </Text>

              <Text style={styles.stateText}>
                No {draftStatus.toLowerCase()}{' '}
                vouchers are available under{' '}
                {selectedCategory?.category_name ||
                  'this category'}.
              </Text>
            </View>
          }
        />
      )}

      <Modal
  visible={isFilterModalVisible}
  transparent
  animationType="slide"
  onRequestClose={
    closeFilterModal
  }>
  <View style={styles.modalOverlay}>
    <Pressable
      style={
        StyleSheet.absoluteFill
      }
      onPress={closeFilterModal}
    />

<View
  style={[
    styles.filterModal,
    {
      paddingBottom:
        Math.max(
          insets.bottom + 14,
          30,
        ),
    },
  ]}>
      <View
        style={
          styles.filterModalHeader
        }>
        <Text
          style={
            styles.filterModalTitle
          }>
          Filter vouchers
        </Text>

        <Pressable
          hitSlop={10}
          onPress={
            closeFilterModal
          }>
          <MaterialDesignIcons
            name="close"
            size={24}
            color={Colors.textPrimary}
          />
        </Pressable>
      </View>

      <Text style={styles.filterLabel}>
        Status
      </Text>

<View
  style={
    styles.filterStatusList
  }>
  {statusFilters.map(
    statusItem => {
      const isSelected =
        draftStatus ===
        statusItem.value;

      return (
        <Pressable
          key={statusItem.value}
          onPress={() =>
            handleDraftStatusChange(
              statusItem.value,
            )
          }
          style={({pressed}) => [
            styles.statusChip,

            isSelected &&
              styles
                .statusChipSelected,

            pressed &&
              styles.buttonPressed,
          ]}>
          <Text
            style={[
              styles.statusChipText,

              isSelected &&
                styles
                  .statusChipTextSelected,
            ]}>
            {statusItem.label}
          </Text>
        </Pressable>
      );
    },
  )}
</View>

      <Text style={styles.filterLabel}>
        From Date
      </Text>

      <Pressable
        style={({pressed}) => [
          styles.dateInput,
          pressed &&
            styles.dateInputPressed,
        ]}
        onPress={() =>
          openDatePicker('FROM')
        }>
        <Text
          style={[
            styles.dateInputText,
            !draftFromDate &&
              styles.datePlaceholderText,
          ]}>
          {draftFromDate ||
            'Select From Date'}
        </Text>

        <MaterialDesignIcons
          name="calendar-month-outline"
          size={22}
          color={Colors.primary}
        />
      </Pressable>

      <Text style={styles.filterLabel}>
        To Date
      </Text>

      <Pressable
        style={({pressed}) => [
          styles.dateInput,
          pressed &&
            styles.dateInputPressed,
        ]}
        onPress={() =>
          openDatePicker('TO')
        }>
        <Text
          style={[
            styles.dateInputText,
            !draftToDate &&
              styles.datePlaceholderText,
          ]}>
          {draftToDate ||
            'Select To Date'}
        </Text>

        <MaterialDesignIcons
          name="calendar-month-outline"
          size={22}
          color={Colors.primary}
        />
      </Pressable>

      {activeDateField ? (
        <DateTimePicker
          value={activePickerDate}
          mode="date"
          display={
            Platform.OS ===
            'android'
              ? 'calendar'
              : 'inline'
          }
          onChange={
            handleDateChange
          }
          minimumDate={
            activeDateField ===
              'TO' &&
            draftFromDate
              ? parseLocalDate(
                  draftFromDate,
                )
              : undefined
          }
          maximumDate={
            activeDateField ===
              'FROM' &&
            draftToDate
              ? parseLocalDate(
                  draftToDate,
                )
              : undefined
          }
        />
      ) : null}

      {isDateMandatoryForStatus(
        draftStatus,
      ) ? (
        <Text
          style={
            styles.dateRequiredText
          }>
          Both dates are required
          for{' '}
          {draftStatus.toLowerCase()}{' '}
          vouchers.
        </Text>
      ) : null}

      <View
        style={
          styles.filterActionRow
        }>
        <Pressable
          style={({pressed}) => [
            styles.resetButton,
            pressed &&
              styles.buttonPressed,
          ]}
          onPress={
            handleResetFilter
          }>
          <Text
            style={
              styles.resetButtonText
            }>
            Reset
          </Text>
        </Pressable>

        <Pressable
          style={({pressed}) => [
            styles.applyButton,
            pressed &&
              styles.buttonPressed,
          ]}
          onPress={
            handleApplyFilter
          }>
          <Text
            style={
              styles.applyButtonText
            }>
            Apply Filter
          </Text>
        </Pressable>
      </View>
    </View>
  </View>
      </Modal>
      
      <VoucherTypeModal
  visible={voucherTypeModalVisible}
  onClose={() =>
    setVoucherTypeModalVisible(false)
  }
  onSinglePress={() => {
    setVoucherTypeModalVisible(false);

    navigation.dispatch(
      CommonActions.navigate({
        name: 'SingleVoucher',
      }),
    );
  }}
  onBulkPress={() => {
    setVoucherTypeModalVisible(false);

    navigation.dispatch(
      CommonActions.navigate({
        name: 'CreateVoucher',
      }),
    );
  }}
/>
    </SafeAreaView>
  );
}

function VoucherCard({
  voucher,
  onPress,
  showSelection = false,
  isSelected = false,
  onToggleSelection,
}: {
  voucher: ExpenseVoucher;
  onPress: () => void;
  showSelection?: boolean;
  isSelected?: boolean;
  onToggleSelection?: () => void;
}) {
  const statusConfig =
    getStatusConfig(voucher.status);

  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [
        styles.voucherCard,

        isSelected &&
          styles.voucherCardSelected,

        pressed &&
          styles.voucherCardPressed,
      ]}>
      <View style={styles.voucherTop}>
        {showSelection ? (
          <Pressable
            hitSlop={8}
            onPress={event => {
              event.stopPropagation();
              onToggleSelection?.();
            }}
            style={({pressed}) => [
              styles.bulkApprovalCheckbox,

              pressed &&
                styles.buttonPressed,
            ]}>
            <MaterialDesignIcons
              name={
                isSelected
                  ? 'checkbox-marked'
                  : 'checkbox-blank-outline'
              }
              size={25}
              color={Colors.primary}
            />
          </Pressable>
        ) : null}

        <View style={styles.voucherIcon}>
          <MaterialDesignIcons
            name="receipt-text-outline"
            size={24}
            color={Colors.primary}
          />
        </View>

        <View style={styles.voucherHeading}>
          <Text
            style={styles.voucherNumber}
            numberOfLines={1}>
            {voucher.voucherNo ||
              `Expense #${voucher.id}`}
          </Text>

          <Text
            style={styles.categoryName}
            numberOfLines={1}>
            {voucher.categoryName ||
              'Expense payment'}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                statusConfig.background,
            },
          ]}>
          <Text
            style={[
              styles.statusText,
              {
                color:
                  statusConfig.color,
              },
            ]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.voucherDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>
            Beneficiary
          </Text>

          <Text
            style={styles.detailValue}
            numberOfLines={1}>
            {voucher.beneficiaryName ||
              'Not available'}
          </Text>
        </View>

        <View style={styles.amountSection}>
          <Text style={styles.detailLabel}>
            Net payable
          </Text>

          <Text style={styles.amountValue}>
            {formatCurrency(
              voucher.netPayable ??
                voucher.grossAmount ??
                0,
            )}
          </Text>
        </View>
      </View>

      {voucher.bankName ? (
        <View style={styles.bankRow}>
          <MaterialDesignIcons
            name="bank-outline"
            size={16}
            color={Colors.textMuted}
          />

          <Text
            style={styles.bankName}
            numberOfLines={1}>
            {voucher.bankName}
          </Text>
        </View>
      ) : null}

      <View style={styles.cardFooter}>
        <MaterialDesignIcons
          name="calendar-blank-outline"
          size={15}
          color={Colors.textMuted}
        />

        <Text style={styles.dateText}>
          {formatDate(
            voucher.expenseDate,
          )}
        </Text>

        <View style={styles.footerSpacer} />

        {Number(
          voucher.attachmentCount ?? 0,
        ) > 0 ? (
          <View style={styles.footerDetail}>
            <MaterialDesignIcons
              name="paperclip"
              size={15}
              color={Colors.textMuted}
            />

            <Text
              style={
                styles.footerDetailText
              }>
              {voucher.attachmentCount}
            </Text>
          </View>
        ) : null}

        {Number(
          voucher.commentsCount ?? 0,
        ) > 0 ? (
          <View style={styles.footerDetail}>
            <MaterialDesignIcons
              name="comment-text-outline"
              size={15}
              color={Colors.textMuted}
            />

            <Text
              style={
                styles.footerDetailText
              }>
              {voucher.commentsCount}
            </Text>
          </View>
        ) : null}

        <View
          style={
            styles.paymentModeBadge
          }>
          <Text style={styles.paymentMode}>
            {voucher.paymentMode ||
              'BANK'}
          </Text>
        </View>

        <MaterialDesignIcons
          name="chevron-right"
          size={21}
          color={Colors.textMuted}
        />
      </View>
    </Pressable>
  );
}

function getStatusConfig(
  status?: ExpenseStatus | string,
) {
  switch (
    String(status || '').toUpperCase()
  ) {
    case 'APPROVED':
      return {
        label: 'Approved',
        color: Colors.success,
        background:
          Colors.successLight,
      };

    case 'REJECTED':
      return {
        label: 'Rejected',
        color: Colors.danger,
        background:
          Colors.dangerLight,
      };

    case 'PENDING':
    case 'SENT_FOR_APPROVAL':
    case 'IN_APPROVAL':
      return {
        label: 'Pending',
        color: Colors.warning,
        background:
          Colors.warningLight,
      };

    case 'SETTLED':
    case 'PAID':
      return {
        label: 'Settled',
        color: Colors.success,
        background:
          Colors.successLight,
      };

    case 'CREATED':
      return {
        label: 'Created',
        color: Colors.info,
        background: Colors.infoLight,
      };

    default:
      return {
        label:
          String(status || 'Unknown'),
        color: Colors.textSecondary,
        background:
          Colors.surfaceSecondary,
      };
  }
}

function formatCurrency(
  amount: number,
) {
  return new Intl.NumberFormat(
    'en-IN',
    {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    },
  ).format(Number(amount || 0));
}

function formatDate(date?: string) {
  if (!date) {
    return 'Date unavailable';
  }

  const parsedDate = new Date(date);

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return date;
  }

  return parsedDate.toLocaleDateString(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor:
      Colors.background,
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerContent: {
    flex: 1,
  },

  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 23,
    fontWeight: '800',
  },

  headerSubtitle: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 12,
  },

  addButton: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },




  categorySection: {
    marginTop: 3,
  },

  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },

  sectionSubtitle: {
    marginTop: 3,
    color: Colors.textMuted,
    fontSize: 10,
  },

  categoryList: {
    paddingHorizontal: 16,
    columnGap: 10,
  },

  categoryCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },

  categoryIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      Colors.primaryLight,
  },

  categoryIconSelected: {
    backgroundColor:
      'rgba(255,255,255,0.18)',
  },

  categoryContent: {
    flex: 1,
    marginLeft: 10,
  },

  categoryNameText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },

  categoryNameSelected: {
    color: Colors.white,
  },

  categoryCountText: {
    marginTop: 4,
    color: Colors.textMuted,
    fontSize: 10,
  },

  categoryCountSelected: {
    color:
      'rgba(255,255,255,0.78)',
  },

  categoryErrorCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      Colors.dangerLight,
  },

  categoryErrorText: {
    flex: 1,
    marginLeft: 8,
    color: Colors.danger,
    fontSize: 11,
  },

  retryLink: {
    color: Colors.danger,
    fontSize: 11,
    fontWeight: '700',
  },

  noCategoryCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  noCategoryText: {
    marginTop: 7,
    color: Colors.textSecondary,
    fontSize: 12,
  },

  statusSection: {
    marginTop: 18,
  },

  statusList: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    columnGap: 8,
  },

  statusChip: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },

  statusChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },

  statusChipText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },

  statusChipTextSelected: {
    color: Colors.white,
  },

  resultHeader: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  resultTitle: {
    maxWidth: 230,
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },

  resultSubtitle: {
    marginTop: 4,
    color: Colors.textMuted,
    fontSize: 10,
    textTransform: 'capitalize',
  },

  statusIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      Colors.surfaceSecondary,
  },

  statusIndicatorDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },

  statusIndicatorText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },

  emptyListContent: {
    flexGrow: 1,
  },

  voucherCard: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },

  voucherCardPressed: {
    opacity: 0.88,
    transform: [
      {
        scale: 0.995,
      },
    ],
  },

  voucherTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  voucherIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      Colors.primaryLight,
  },

  voucherHeading: {
    flex: 1,
    marginLeft: 12,
  },

  voucherNumber: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },

  categoryName: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 12,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 18,
  },

  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },

  divider: {
    height: 1,
    marginVertical: 14,
    backgroundColor: Colors.border,
  },

  voucherDetails: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  detailItem: {
    flex: 1,
    paddingRight: 10,
  },

  detailLabel: {
    color: Colors.textMuted,
    fontSize: 10,
  },

  detailValue: {
    marginTop: 5,
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },

  amountSection: {
    alignItems: 'flex-end',
  },

  amountValue: {
    marginTop: 5,
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },

  bankRow: {
    marginTop: 13,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },

  bankName: {
    flex: 1,
    marginLeft: 7,
    color: Colors.textSecondary,
    fontSize: 11,
  },

  cardFooter: {
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },

  dateText: {
    marginLeft: 6,
    color: Colors.textMuted,
    fontSize: 11,
  },

  footerSpacer: {
    flex: 1,
  },

  footerDetail: {
    marginRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  footerDetailText: {
    marginLeft: 4,
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },

  paymentModeBadge: {
    marginRight: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor:
      Colors.primaryLight,
  },

  paymentMode: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },

  stateContainer: {
    flex: 1,
    minHeight: 300,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stateText: {
    marginTop: 8,
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },

  errorTitle: {
    marginTop: 13,
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },

  emptyIcon: {
    width: 74,
    height: 74,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      Colors.primaryLight,
  },

  emptyTitle: {
    marginTop: 14,
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },

  retryButton: {
    marginTop: 17,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },

  retryText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },






modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.45)',
  justifyContent: 'flex-end',
},

filterModal: {
  maxHeight: '84%',
  backgroundColor: Colors.white,
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  paddingHorizontal: 20,
  paddingTop: 20,
},

filterModalHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 22,
},

filterModalTitle: {
  fontSize: 19,
  fontWeight: '700',
  color: Colors.textPrimary,
},

filterLabel: {
  marginBottom: 8,
  fontSize: 13,
  fontWeight: '600',
  color: Colors.textSecondary,
},

selectedStatusBox: {
  minHeight: 46,
  borderRadius: 10,
  backgroundColor: '#F3F5F7',
  justifyContent: 'center',
  paddingHorizontal: 14,
  marginBottom: 18,
},

selectedStatusText: {
  fontSize: 14,
  fontWeight: '700',
  color: Colors.textPrimary,
},



dateRequiredText: {
  fontSize: 12,
  lineHeight: 18,
  color: '#C77B00',
  marginBottom: 18,
},

filterActionRow: {
  flexDirection: 'row',
  gap: 12,
},

resetButton: {
  flex: 1,
  height: 48,
  borderWidth: 1,
  borderColor: Colors.primary,
  borderRadius: 10,
  alignItems: 'center',
  justifyContent: 'center',
},

resetButtonText: {
  fontSize: 14,
  fontWeight: '700',
  color: Colors.primary,
},

applyButton: {
  flex: 1,
  height: 48,
  borderRadius: 10,
  backgroundColor: Colors.primary,
  alignItems: 'center',
  justifyContent: 'center',
},

applyButtonText: {
  fontSize: 14,
  fontWeight: '700',
  color: Colors.white,
  },
dateInput: {
  height: 48,
  borderWidth: 1,
  borderColor: '#D8DEE4',
  borderRadius: 10,
  paddingHorizontal: 14,
  marginBottom: 18,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: Colors.white,
},

dateInputPressed: {
  opacity: 0.75,
},

dateInputText: {
  flex: 1,
  fontSize: 14,
  fontWeight: '500',
  color: Colors.textPrimary,
},

datePlaceholderText: {
  color: Colors.textSecondary,
  },


  

  ////
  searchRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
    marginBottom: 18,
  paddingHorizontal:16,
},

searchContainer: {
  flex: 1,
  height: 48,
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 14,
  borderWidth: 1,
  borderColor: '#E1E5EA',
  borderRadius: 14,
  backgroundColor: Colors.white,
},

searchInput: {
  flex: 1,
  marginLeft: 9,
  paddingVertical: 0,
  fontSize: 14,
  color: Colors.textPrimary,
},

filterButton: {
  width: 48,
  height: 48,
  borderRadius: 14,
  backgroundColor: Colors.primary,
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
},

filterActiveDot: {
  position: 'absolute',
  top: 7,
  right: 7,
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: '#FFC107',
},

buttonPressed: {
  opacity: 0.8,
},

sectionHeaderContent: {
  flex: 1,
  paddingRight: 12,
},

categoryListContent: {
  gap: 10,
  paddingRight: 16,
  paddingLeft:16,
},

categoryCard: {
  width: 190,
  minHeight: 72,
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 12,
  paddingVertical: 12,
  borderWidth: 1,
  borderColor: '#E1E5EA',
  borderRadius: 14,
  backgroundColor: Colors.white,
},

categoryCardActive: {
  borderColor: Colors.primary,
  backgroundColor: Colors.primary,
},

categoryIconBox: {
  width: 38,
  height: 38,
  borderRadius: 11,
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 10,
  backgroundColor: '#EAF9F1',
},

categoryIconBoxActive: {
  backgroundColor: 'rgba(255, 255, 255, 0.18)',
},

categoryTextArea: {
  flex: 1,
},


categoryNameActive: {
  color: Colors.white,
},

categoryCount: {
  marginTop: 4,
  fontSize: 11,
  color: Colors.textMuted,
},

categoryCountActive: {
  color: 'rgba(255, 255, 255, 0.85)',
  },

  selectedCategoryAmount: {
  marginTop: 5,
  fontSize: 11,
  color: Colors.textMuted,
},

selectedCategoryAmountValue: {
  fontSize: 12,
  fontWeight: '700',
  color: Colors.primary,
  },

  selectedCategoryMeta: {
  marginTop: 4,
  fontSize: 11,
  fontWeight: '500',
  color: Colors.textMuted,
  textTransform: 'uppercase',
  },
  
  filterStatusList: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
  marginBottom: 18,
},
bulkCheckboxButton: {
  marginLeft: 8,
  alignItems: 'center',
  justifyContent: 'center',
  },
bulkApprovalCheckbox: {
  width: 32,
  height: 40,
  marginRight: 4,
  alignItems: 'center',
  justifyContent: 'center',
},

voucherCardSelected: {
  borderWidth: 1.5,
  borderColor: Colors.primary,
  },

  bulkSelectionBar: {
  marginHorizontal: 16,
  marginBottom: 12,
  padding: 14,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: Colors.border,
  backgroundColor: Colors.surface,
},

bulkSelectionTop: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},

bulkSelectionInfo: {
  flex: 1,
},

bulkSelectionTitle: {
  color: Colors.textPrimary,
  fontSize: 14,
  fontWeight: '800',
},

bulkSelectionCount: {
  marginTop: 3,
  color: Colors.textMuted,
  fontSize: 11,
},

bulkClearText: {
  color: Colors.danger,
  fontSize: 12,
  fontWeight: '700',
},

bulkSelectionActions: {
  marginTop: 12,
  flexDirection: 'row',
  columnGap: 9,
},

bulkSelectAllButton: {
  flex: 1,
  minHeight: 44,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: Colors.primary,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  columnGap: 7,
  backgroundColor: Colors.primaryLight,
},

bulkSelectAllText: {
  color: Colors.primary,
  fontSize: 12,
  fontWeight: '700',
},

bulkApproveButton: {
  flex: 1,
  minHeight: 44,
  borderRadius: 12,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  columnGap: 7,
  backgroundColor: Colors.success,
},

bulkApproveButtonDisabled: {
  opacity: 0.45,
},

bulkApproveText: {
  color: Colors.white,
  fontSize: 12,
  fontWeight: '800',
},
});