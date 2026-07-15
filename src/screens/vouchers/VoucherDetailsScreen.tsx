import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Linking,
  RefreshControl,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  MaterialDesignIcons,
} from '@react-native-vector-icons/material-design-icons/static';
import {pick} from '@react-native-documents/picker';

import {Colors} from '../../constants/colors';
import {useAuthStore} from '../../store/authStore';
import {
  getRejectionReasonLabel,
  useApprovalStore,
} from '../../store/approvalStore';
import {useVoucherStore} from '../../store/voucherStore';
import {useAttachmentStore} from '../../store/attachmentStore';

import {RejectionReason} from '../../types/approval.types';
import {
  CategoryAttachmentConfig,
  SelectedAttachmentFile,
} from '../../types/attachment.types';
import {useNavigation} from '@react-navigation/native';
import { useCenterStore } from '../../store/centerStore';
import { apiClient } from '../../api/apiClient';
import { expenseApi } from '../../api/expense.api';
import type {
  ExpenseComment,
} from '../../types/expenseComment.types';

// type TimelineItem = {
//   id: string;
//   level: number;
//   approverName: string;
//   approverRole?: string;
//   decision: string;
//   remarks: string;
//   createdAt: string;
//   isCreator?: boolean;
//   isMandatory?: boolean;
//   isDirector?: boolean;
// };

type TimelineItem = {
  id: string;
  level: number;
  approverName: string;
  approverRole?: string;
  decision: string;
  remarks: string;
  createdAt: string;
  isCreator?: boolean;
  isMandatory?: boolean;
  isDirector?: boolean;
};

type NormalizedApprovalLevel = {
  approvalLevel: number;
  approverRoleId: number;
  approverName: string;
  isMandatory: boolean;
  isDirector: boolean;
  approved: boolean;
};

const OTHER_REJECTION_REASON_ID = -1;

const OTHER_REJECTION_REASON = {
  id: OTHER_REJECTION_REASON_ID,
  rejectionName: 'Other',
  description:
    'Enter a custom rejection reason.',
  status: true,
  createdAt: '',
  updatedAt: '',
  delete_status: false,
} as RejectionReason;

const isOtherRejectionReason = (
  reason?: RejectionReason | null,
): boolean => {
  return (
    getRejectionReasonLabel(reason)
      .trim()
      .toLowerCase() === 'other'
  );
};

type UploadedExpenseAttachment = {
  id: number;
  expense_id: number;
  attachment_type: string;
  file_path: string;
  created_at?: string;
};

type MessageAttachmentFile = {
  uri: string;
  name: string;
  type: string;
  size?: number | null;
};

const normalizeAttachmentType = (
  value: unknown,
): string => {
  return String(value ?? '')
    .trim()
    .toLowerCase();
};

const buildAttachmentUrl = (
  filePath: string,
): string => {
  const normalizedPath = String(
    filePath || '',
  ).trim();

  if (!normalizedPath) {
    return '';
  }

if (
  /^(https?:\/\/|file:\/\/|content:\/\/)/i.test(
    normalizedPath,
  )
) {
  return normalizedPath;
}

  const apiBaseUrl = String(
    apiClient.defaults.baseURL || '',
  ).trim();

  /*
   * Extract only the server origin.
   *
   * Example:
   * https://example.com/api/accounts
   * becomes:
   * https://example.com
   */
  const originMatch =
    apiBaseUrl.match(
      /^(https?:\/\/[^/]+)/i,
    );

  const serverRoot =
    originMatch?.[1] ||
    apiBaseUrl
      .replace(/\/api(?:\/.*)?$/i, '')
      .replace(/\/+$/, '');

  return `${serverRoot}/${normalizedPath.replace(
    /^\/+/,
    '',
  )}`;
};

const getMessageAttachmentPath = (
  attachment?: ExpenseMessageAttachment | null,
): string => {
  return String(
    attachment?.file_path ??
      attachment?.filePath ??
      attachment?.file_url ??
      attachment?.fileUrl ??
      attachment?.attachment_url ??
      attachment?.attachmentUrl ??
      attachment?.path ??
      attachment?.url ??
      '',
  ).trim();
};

const getMessageAttachmentName = (
  attachment?: ExpenseMessageAttachment | null,
  index = 0,
): string => {
  const providedName = String(
    attachment?.file_name ??
      attachment?.filename ??
      attachment?.original_name ??
      attachment?.originalName ??
      attachment?.name ??
      '',
  ).trim();

  if (providedName) {
    return providedName;
  }

  const filePath =
    getMessageAttachmentPath(
      attachment,
    );

  if (filePath) {
    const cleanPath =
      filePath.split('?')[0];

    const extractedName =
      cleanPath
        .split('/')
        .filter(Boolean)
        .pop();

    if (extractedName) {
      try {
        return decodeURIComponent(
          extractedName,
        );
      } catch {
        return extractedName;
      }
    }
  }

  return `Attachment ${index + 1}`;
};

const isAdminOrDirectorComment = (
  item: ExpenseComment,
): boolean => {
  const commentUserType = String(
    item?.user_type ?? '',
  )
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  return [
    'admin',
    'administrator',
    'director',
    'superadmin',
    'superadministrator',
  ].includes(commentUserType);
};

type ExpenseMessageAttachment = {
  id?: number | string;

  file_path?: string;
  filePath?: string;

  file_url?: string;
  fileUrl?: string;

  attachment_url?: string;
  attachmentUrl?: string;

  path?: string;
  url?: string;

  file_name?: string;
  filename?: string;

  original_name?: string;
  originalName?: string;

  name?: string;
  mime_type?: string;
  type?: string;
};

export default function VoucherDetailsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const session = useAuthStore(
    state => state.session,
  );

const {
  selectedVoucher,
  setSelectedVoucher,
  loadVouchers,
} = useVoucherStore();
  

  const expenseId = Number(
  (selectedVoucher?.raw as any)?.id ??
    selectedVoucher?.id ??
    0,
);
  const [
  expenseDetails,
  setExpenseDetails,
] = useState<any | null>(null);

const [
  isExpenseDetailsLoading,
  setIsExpenseDetailsLoading,
] = useState(false);

const [
  expenseDetailsError,
  setExpenseDetailsError,
] = useState('');
  
  const currentUserId = Number(
  session?.employee?.id ?? 0,
);

const employeeData =
  session?.employee as any;

const messageUserType = String(
  employeeData?.userTypeName ??
    employeeData?.user_type_name ??
    employeeData?.roleName ??
    employeeData?.role_name ??
    '',
)
  .trim()
  .toLowerCase();

const normalizedMessageUserType =
  messageUserType.replace(
    /[^a-z0-9]/g,
    '',
  );
  
  const isEmployeeUser =
  normalizedMessageUserType ===
  'employee';

const canRaiseQuery = [
  'admin',
  'administrator',
  'director',
  'superadmin',
  'superadministrator',
].includes(
  normalizedMessageUserType,
);
  

  const {
    rejectionReasons,
    isLoadingRejectionReasons,
    isSendingForApproval,
    isSubmittingDecision,
    rejectionReasonError,
    approvalActionError,

    loadRejectionReasons,
    sendForApproval,
    approveExpense,
    rejectExpense,
    clearApprovalMessages,
  } = useApprovalStore();

  const {
    selectedFiles,
    isUploading,
    uploadError,

    setSelectedFile,
    removeSelectedFile,
    validateMandatoryAttachments,
    uploadAttachments,
    clearUploadMessages,
    resetAttachments,
  } = useAttachmentStore();

  const [
    isRejectModalVisible,
    setIsRejectModalVisible,
  ] = useState(false);

  const [
    isAttachmentModalVisible,
    setIsAttachmentModalVisible,
  ] = useState(false);

  const [
    selectedRejectionReason,
    setSelectedRejectionReason,
  ] = useState<RejectionReason | null>(
    null,
  );

  const [
    rejectionRemarks,
    setRejectionRemarks,
  ] = useState('');


  const [
  comments,
  setComments,
] = useState<ExpenseComment[]>([]);

const [
  selectedReplyComment,
  setSelectedReplyComment,
] = useState<ExpenseComment | null>(
  null,
);

const [
  isLoadingComments,
  setIsLoadingComments,
] = useState(false);

const [
  commentsError,
  setCommentsError,
] = useState('');

const [
  commentText,
  setCommentText,
] = useState('');
  
  const [
  messageAttachments,
  setMessageAttachments,
] = useState<MessageAttachmentFile[]>([]);

const [
  isSendingComment,
  setIsSendingComment,
] = useState(false);
  
  const [
  isMessageModalVisible,
  setIsMessageModalVisible,
] = useState(false);

const [
  resolvingCommentIds,
  setResolvingCommentIds,
] = useState<Set<number>>(
  () => new Set<number>(),
  );

  const message = commentText.trim();
  const canEmployeeReply =
  useCallback(
    (
      item: ExpenseComment,
    ): boolean => {
      if (
        !item ||
        item.is_resolved
      ) {
        return false;
      }

      if (!isEmployeeUser) {
        return false;
      }

      if (
        Number(item.user_id) ===
        currentUserId
      ) {
        return false;
      }

      return isAdminOrDirectorComment(
        item,
      );
    },
    [
      isEmployeeUser,
      currentUserId,
      isAdminOrDirectorComment,
    ],
    );
  
  
const expense = useMemo(() => {
  const rawExpense =
    (selectedVoucher?.raw as any) ??
    {};

  if (!expenseDetails) {
    return rawExpense;
  }

  const rawPayments =
    Array.isArray(
      rawExpense?.payments,
    )
      ? rawExpense.payments
      : [];

  const detailPayments =
    Array.isArray(
      expenseDetails?.payments,
    )
      ? expenseDetails.payments
      : [];

  const mergedPayments =
    detailPayments.map(
      (
        payment: any,
        index: number,
      ) => ({
        ...(rawPayments[index] ??
          {}),
        ...payment,

        expenseBankDetails:
          payment
            ?.expenseBankDetails ??
          rawPayments[index]
            ?.expenseBankDetails ??
          [],
      }),
    );

  return {
    ...rawExpense,
    ...expenseDetails,

    category: {
      ...(rawExpense?.category ??
        {}),
      ...(expenseDetails?.category ??
        {}),

      categories_attachment:
        expenseDetails?.category
          ?.categories_attachment ??
        rawExpense?.category
          ?.categories_attachment ??
        [],
    },

    payments:
      mergedPayments.length > 0
        ? mergedPayments
        : rawPayments,

    attachments:
      expenseDetails?.attachments ??
      rawExpense?.attachments ??
      [],

    approval_levels:
      expenseDetails
        ?.approval_levels ??
      rawExpense
        ?.approval_levels ??
      [],

    approval:
      expenseDetails?.approval ??
      rawExpense?.approval ??
      [],

    approval_decisions:
      expenseDetails
        ?.approval_decisions ??
      rawExpense
        ?.approval_decisions ??
      [],
  };
}, [
  selectedVoucher?.raw,
  expenseDetails,
]);
  
  const expenseStatus = String(
  expense?.status ?? '',
)
  .trim()
  .toUpperCase();

const canUseMessaging =
  expenseStatus === 'PENDING';

  const {
  vouchers,
  isLoading,
  isRefreshing,
  error,
  totalRecords,
} = useVoucherStore();
  
  
  const loadExpenseDetails =
  useCallback(
    async (
      showLoader = true,
    ) => {
      if (expenseId <= 0) {
        return;
      }

      try {
        if (showLoader) {
          setIsExpenseDetailsLoading(
            true,
          );
        }

        setExpenseDetailsError('');

        const details =
          await expenseApi
            .getExpenseDetails(
              expenseId,
            );

        setExpenseDetails(details);
      } catch (error: any) {
        console.error(
          'Unable to load expense details:',
          error,
        );

        setExpenseDetailsError(
          error?.response?.data
            ?.message ||
            error?.message ||
            'Unable to load expense details.',
        );
      } finally {
        if (showLoader) {
          setIsExpenseDetailsLoading(
            false,
          );
        }
      }
    },
    [expenseId],
  );

useEffect(() => {
  loadExpenseDetails();
}, [loadExpenseDetails]);
  
  /*
   * Do not return before hooks.
   * Use a safe empty object when no voucher is selected.
   */

  console.log('expense expense expense', expense)
  const firstPayment =
    expense?.payments?.[0] ?? null;

  const firstBankDetail =
    firstPayment?.expenseBankDetails?.[0] ??
    null;

  const currentStatus = String(
    selectedVoucher?.status ||
      expense?.status ||
      '',
  )
    .trim()
    .toUpperCase();

  const employeeId = Number(
    session?.employee?.id || 0,
  );

  const loggedInRoleId = Number(
    session?.employee?.user_type || 0,
  );

  const approvalRequestId = Number(
    expense?.approvalRequest?.id ||
      expense?.approval_request_id ||
      expense?.approvalRequestId ||
      0,
  );

  const expenseCategoryId = Number(
    expense?.category?.id ||
      expense?.category_id ||
      0,
  );

const displayedRejectionReasons =
  useMemo(() => {
    const apiAlreadyHasOther =
      rejectionReasons.some(
        reason =>
          isOtherRejectionReason(
            reason,
          ),
      );

    return apiAlreadyHasOther
      ? rejectionReasons
      : [
          ...rejectionReasons,
          OTHER_REJECTION_REASON,
        ];
  }, [rejectionReasons]);

const isOtherReasonSelected =
  isOtherRejectionReason(
    selectedRejectionReason,
  );

  const selectedCenterId = useCenterStore(
  state => state.selectedCenterId,
);

const centreId = Number(
  selectedCenterId ||
    session?.centreId ||
    0,
);

const canSubmitRejection =
  Boolean(
    selectedRejectionReason,
  ) &&
  (!isOtherReasonSelected ||
    Boolean(
      rejectionRemarks.trim(),
    )) &&
  !isSubmittingDecision;

  /*
   * Salary attachments are always optional.
   */
  const isSalaryCategory =
    String(
      expense?.category?.category_name ||
        selectedVoucher?.categoryName ||
        '',
    )
      .trim()
      .toUpperCase() === 'SALARY';

  /*
   * Normalize configured category attachment fields.
   */
  const attachmentConfigs =
    useMemo<
      CategoryAttachmentConfig[]
    >(() => {
      const configs =
        expense?.category
          ?.categories_attachment;

      if (!Array.isArray(configs)) {
        return [];
      }

      const uniqueTypes =
        new Set<string>();

      return configs
        .map(
          (
            item: any,
          ): CategoryAttachmentConfig => ({
            id: item?.id,

            attachmentType: String(
              item?.attachmentType || '',
            ).trim(),

            isMandatory:
              item?.isMandatory === true ||
              item?.isMandatory === 1 ||
              item?.isMandatory === '1',
          }),
        )
        .filter(
          (
            item: CategoryAttachmentConfig,
          ) => {
            if (
              !item.attachmentType ||
              uniqueTypes.has(
                item.attachmentType,
              )
            ) {
              return false;
            }

            uniqueTypes.add(
              item.attachmentType,
            );

            return true;
          },
        );
    }, [
      expense?.category
        ?.categories_attachment,
    ]);

const uploadedAttachments =
  useMemo<
    UploadedExpenseAttachment[]
  >(() => {
    return Array.isArray(
      expense?.attachments,
    )
      ? expense.attachments
      : [];
  }, [expense?.attachments]);

  const uploadedAttachmentByType =
  useMemo(() => {
    const attachmentMap =
      new Map<
        string,
        UploadedExpenseAttachment
      >();

    uploadedAttachments.forEach(
      attachment => {
        const normalizedType =
          normalizeAttachmentType(
            attachment
              ?.attachment_type,
          );

        if (
          normalizedType &&
          attachment?.file_path
        ) {
          attachmentMap.set(
            normalizedType,
            attachment,
          );
        }
      },
    );

    return attachmentMap;
  }, [uploadedAttachments]);

  const attachmentCount =
    uploadedAttachments.length;

  const uploadedAttachmentTypes =
    useMemo(() => {
      const types = new Set<string>();

      uploadedAttachments.forEach(
        (attachment: any) => {
          const attachmentType =
            String(
              attachment?.attachment_type ||
                attachment?.attachmentType ||
                attachment?.type ||
                '',
            ).trim();

          if (attachmentType) {
            types.add(attachmentType);
          }
        },
      );

      return types;
    }, [uploadedAttachments]);

  const hasAnySelectedAttachment =
    Object.values(selectedFiles).some(
      file => Boolean(file),
    );

  /*
   * Salary category never has mandatory attachments.
   */
  const mandatoryAttachmentConfigs =
    isSalaryCategory
      ? []
      : attachmentConfigs.filter(
          (
            config: CategoryAttachmentConfig,
          ) => config.isMandatory,
        );

  const missingUploadedMandatoryAttachments =
    mandatoryAttachmentConfigs.filter(
      (
        config: CategoryAttachmentConfig,
      ) =>
        !uploadedAttachmentTypes.has(
          config.attachmentType,
        ),
    );

  const hasRequiredAttachment =
    missingUploadedMandatoryAttachments
      .length === 0;

  const loggedInEmployeeName = String(
  session?.employee?.employee_name,
).trim();

const creatorName = useMemo(() => {
  const apiCreatorName = String(
    expense?.created_by_name ??
      expense?.creator_name ??
      expense?.approver_name ??
      expense?.created_by?.employee_name ??
      expense?.created_by?.name ??
      expense?.creator?.employee_name ??
      expense?.creator?.name ??
      '',
  ).trim();

  if (apiCreatorName) {
    return apiCreatorName;
  }

  const creatorId = Number(
    expense?.user_id ??
      expense?.userId ??
      0,
  );

  if (
    creatorId > 0 &&
    creatorId === employeeId &&
    loggedInEmployeeName
  ) {
    return loggedInEmployeeName;
  }

  return creatorId > 0
    ? `User #${creatorId}`
    : 'Unknown user';
}, [
  expense?.created_by_name,
  expense?.createdByName,
  expense?.creator_name,
  expense?.creatorName,
  expense?.created_by,
  expense?.creator,
  expense?.user_id,
  expense?.userId,
  employeeId,
  loggedInEmployeeName,
]);
  
  /*
   * Normalize approval levels.
   */
  const normalizedApprovalLevels =
  useMemo<
    NormalizedApprovalLevel[]
  >(() => {
    const levels = Array.isArray(
      expense?.approval_levels,
    )
      ? expense.approval_levels
      : [];

    return levels.map(
      (
        level: any,
      ): NormalizedApprovalLevel => ({
        approvalLevel: Number(
          level?.approvalLevel ??
            level?.approval_level ??
            level?.level ??
            0,
        ),

        approverRoleId: Number(
          level?.approverRoleId ??
            level?.approver_role_id ??
            0,
        ),

        approverName: String(
          level?.approverName ??
            level?.approver_name ??
            '',
        ).trim(),

        isMandatory:
          level?.isMandatory === true ||
          level?.isMandatory === 1 ||
          level?.isMandatory === '1',

        isDirector:
          level?.isDirector === true ||
          level?.isDirector === 1 ||
          level?.isDirector === '1',

        approved:
          level?.approved === true ||
          level?.approved === 1 ||
          level?.approved === '1',
      }),
    );
  }, [expense?.approval_levels]);

const currentApprovalLevel = Number(
  expense?.approvalRequest?.currentLevel ??
    expense?.approvalRequest?.current_level ??
    0,
);

const currentUserApprovalLevel =
  normalizedApprovalLevels.find(
    (
      level: NormalizedApprovalLevel,
    ) =>
      level.approverRoleId ===
        employeeId &&
      level.approvalLevel ===
        currentApprovalLevel &&
      !level.approved,
  );

const isCurrentUserApprover =
  Boolean(currentUserApprovalLevel);

const canSendForApproval =
  currentStatus === 'CREATED';

const canApproveOrReject =
  currentStatus === 'PENDING' &&
  approvalRequestId > 0 &&
  employeeId > 0 &&
  currentApprovalLevel > 0 &&
  isCurrentUserApprover;
  const approvalHistory =
  useMemo<any[]>(() => {
    const history: any[] = [];

    if (
      Array.isArray(
        expense?.approval,
      )
    ) {
      history.push(
        ...expense.approval,
      );
    }

    if (
      Array.isArray(
        expense?.approval_decisions,
      )
    ) {
      history.push(
        ...expense
          .approval_decisions,
      );
    }

    if (
      Array.isArray(
        expense?.approvalHistory,
      )
    ) {
      history.push(
        ...expense.approvalHistory,
      );
    }

    return history;
  }, [
    expense?.approval,
    expense?.approval_decisions,
    expense?.approvalHistory,
  ]);

  const creatorApproval =
  useMemo(() => {
    const approvalRecords =
      Array.isArray(expense?.approval)
        ? expense.approval
        : [];

    return (
      approvalRecords.find(
        (item: any) => {
          const type = String(
            item?.type || '',
          )
            .trim()
            .toLowerCase();

          const status = String(
            item?.status || '',
          )
            .trim()
            .toUpperCase();

          return (
            type === 'created' ||
            status === 'CREATED'
          );
        },
      ) ?? null
    );
  }, [expense?.approval]);

const approvalCreatorName =
  useMemo(() => {
    const name = String(
      creatorApproval?.user_name ??
        creatorApproval?.userName ??
        creatorApproval?.employee_name ??
        creatorApproval?.employeeName ??
        '',
    ).trim();

    if (name) {
      return name;
    }

    const creatorId = Number(
      creatorApproval?.user_id ??
        expense?.user_id ??
        0,
    );

    return creatorId > 0
      ? `User #${creatorId}`
      : 'Unknown user';
  }, [
    creatorApproval,
    expense?.user_id,
  ]);



  const timelineItems =
  useMemo<TimelineItem[]>(() => {
const generatedItems =
  getApprovalTimeline(
    approvalHistory,
    expense?.approval_levels,
    expense?.status,
    expense?.approval_decisions,
  ).filter(item => {
        const decision = String(
          item.decision || '',
        )
          .trim()
          .toUpperCase();

        return (
          !item.isCreator &&
          decision !== 'CREATED'
        );
      });

    const uniqueApprovalItems =
      new Map<
        string,
        TimelineItem
      >();

    generatedItems.forEach(item => {
      const key = [
        Number(item.level || 0),
        String(
          item.approverName || '',
        )
          .trim()
          .toLowerCase(),
      ].join('|');

      const existing =
        uniqueApprovalItems.get(
          key,
        );

      const itemDecision =
        String(
          item.decision || '',
        ).toUpperCase();

      const existingDecision =
        String(
          existing?.decision || '',
        ).toUpperCase();

      const itemIsFinal =
        itemDecision ===
          'APPROVED' ||
        itemDecision ===
          'REJECTED';

      const existingIsFinal =
        existingDecision ===
          'APPROVED' ||
        existingDecision ===
          'REJECTED';

      if (
        !existing ||
        (itemIsFinal &&
          !existingIsFinal)
      ) {
        uniqueApprovalItems.set(
          key,
          item,
        );
      }
    });

    const creatorItem: TimelineItem = {
  id: `creator-${expense?.id ?? expenseId}`,
  level: 0,

  approverName:
    approvalCreatorName,

  approverRole: String(
    creatorApproval?.user_type_name ||
      creatorApproval?.userTypeName ||
      'Created By',
  ).trim(),

  decision: 'CREATED',

  remarks: String(
    creatorApproval?.remarks || '',
  ).trim(),

  createdAt: String(
    creatorApproval?.created_at ||
      expense?.created_at ||
      '',
  ),

  isCreator: true,
  isMandatory: false,
  isDirector: false,
};

    return [
      creatorItem,
      ...Array.from(
        uniqueApprovalItems.values(),
      ).sort(
        (first, second) =>
          Number(
            first.level || 0,
          ) -
          Number(
            second.level || 0,
          ),
      ),
    ];
}, [
  approvalHistory,
  expense?.approval_levels,
  expense?.approval_decisions,
  expense?.status,
  expense?.id,
  expense?.created_at,
  expenseId,
  approvalCreatorName,
  creatorApproval,
]);


  useEffect(() => {
    return () => {
      clearApprovalMessages();
      resetAttachments();
    };
  }, [
    clearApprovalMessages,
    resetAttachments,
  ]);

  const updateLocalVoucherStatus = (
    status: string,
  ) => {
    if (!selectedVoucher) {
      return;
    }

    setSelectedVoucher({
      ...selectedVoucher,
      status,

      raw: {
        ...expense,
        status,

        approvalRequest:
          expense?.approvalRequest
            ? {
                ...expense.approvalRequest,
                status,
              }
            : expense?.approvalRequest,
      },
    });
  };
  

  const updateLocalApprovalAfterApprove =
    () => {
      if (!selectedVoucher) {
        return;
      }

      const updatedApprovalLevels =
        normalizedApprovalLevels.map(
          (
            level:
              NormalizedApprovalLevel,
          ) => {
            const isCurrentUserLevel =
              level.approverRoleId ===
                employeeId &&
              level.approvalLevel ===
                currentApprovalLevel;

            return isCurrentUserLevel
              ? {
                  ...level,
                  approved: true,
                }
              : level;
          },
        );

      const allApproved =
        updatedApprovalLevels.length > 0 &&
        updatedApprovalLevels.every(
          level => level.approved,
        );

      const nextStatus = allApproved
        ? 'APPROVED'
        : 'PENDING';

      setSelectedVoucher({
        ...selectedVoucher,
        status: nextStatus,

        raw: {
          ...expense,
          status: nextStatus,

          approval_levels:
            updatedApprovalLevels,

          approvalRequest:
            expense?.approvalRequest
              ? {
                  ...expense.approvalRequest,
                  status: nextStatus,
                }
              : expense?.approvalRequest,
        },
      });
    };

  const handleSendForApproval = () => {
    if (!hasRequiredAttachment) {
      const missingNames =
        missingUploadedMandatoryAttachments
          .map(
            item =>
              item.attachmentType,
          )
          .join(', ');

      Alert.alert(
        'Attachment required',
        missingUploadedMandatoryAttachments
          .length === 1
          ? `${missingNames} is required.`
          : `The following attachments are required: ${missingNames}.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Upload',
            onPress: () => {
              clearUploadMessages();

              setIsAttachmentModalVisible(
                true,
              );
            },
          },
        ],
      );

      return;
    }

    Alert.alert(
      'Send for approval',
      'Are you sure you want to send this voucher for approval?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Send',
          onPress: async () => {
            const result =
              await sendForApproval(
                Number(expense.id),
              );

            if (result.success) {
              updateLocalVoucherStatus(
                'PENDING',
              );

              Alert.alert(
                'Success',
                result.message,
              );
            } else {
              Alert.alert(
                'Unable to continue',
                result.message,
              );
            }
          },
        },
      ],
    );
  };

  const openAttachmentModal = () => {
    clearUploadMessages();

    setIsAttachmentModalVisible(true);
  };

  const closeAttachmentModal = () => {
    if (isUploading) {
      return;
    }

    setIsAttachmentModalVisible(false);
    clearUploadMessages();
  };

  const handlePickAttachment = async (
    attachmentType: string,
  ) => {
    try {
      const result = await pick({
        allowMultiSelection: false,

        type: [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
      });

      const pickedFile = result?.[0];

      if (!pickedFile?.uri) {
        return;
      }

      const file:
        SelectedAttachmentFile = {
        uri: pickedFile.uri,

        name:
          pickedFile.name ||
          `${attachmentType}-attachment`,

        type:
          pickedFile.type ||
          'application/octet-stream',

        size: pickedFile.size,
      };

      setSelectedFile(
        attachmentType,
        file,
      );
    } catch (error: any) {
      const errorCode =
        error?.code || error?.name;

      const isCancelled =
        errorCode ===
          'DOCUMENT_PICKER_CANCELED' ||
        errorCode ===
          'OPERATION_CANCELED' ||
        errorCode === 'AbortError';

      if (isCancelled) {
        return;
      }

      Alert.alert(
        'Unable to select file',
        error?.message ||
          'Something went wrong while selecting the attachment.',
      );
    }
  };

  const handleUploadAttachments =
    async () => {
      /*
       * Salary configuration is converted to optional
       * before validation and upload.
       */
      const effectiveAttachmentConfigs:
        CategoryAttachmentConfig[] =
        isSalaryCategory
          ? attachmentConfigs.map(
              (
                config:
                  CategoryAttachmentConfig,
              ): CategoryAttachmentConfig => ({
                ...config,
                isMandatory: false,
              }),
            )
          : attachmentConfigs;

      const validation =
        validateMandatoryAttachments(
          effectiveAttachmentConfigs,
        );

      if (!validation.valid) {
        Alert.alert(
          'Attachment required',
          validation.message,
        );

        return;
      }

      if (!hasAnySelectedAttachment) {
        Alert.alert(
          'Select attachment',
          'Please select at least one attachment.',
        );

        return;
      }

      const filesBeforeUpload = {
        ...selectedFiles,
      };

      const result =
        await uploadAttachments({
          expenseId: Number(
            expense.id,
          ),

          categoryId:
            expenseCategoryId,

          attachmentConfigs:
            effectiveAttachmentConfigs,
        });

      if (!result.success) {
        Alert.alert(
          'Upload failed',
          result.message,
        );

        return;
      }

      const newLocalAttachments =
        Object.entries(
          filesBeforeUpload,
        ).map(
          (
            [attachmentType, file],
            index,
          ) => ({
            id: `local-${Date.now()}-${index}`,

            attachment_type:
              attachmentType,

            attachmentType,

            file_name: file.name,

            filename: file.name,

            file_url: file.uri,

            url: file.uri,

            isLocalUpload: true,
          }),
        );

      const selectedAttachmentTypes =
        Object.keys(
          filesBeforeUpload,
        );

      const updatedExpense = {
        ...expense,

        attachments: [
          ...uploadedAttachments.filter(
            (existing: any) => {
              const existingType =
                String(
                  existing?.attachment_type ||
                    existing?.attachmentType ||
                    existing?.type ||
                    '',
                ).trim();

              return (
                !selectedAttachmentTypes.includes(
                  existingType,
                )
              );
            },
          ),

          ...newLocalAttachments,
        ],
      };

      if (selectedVoucher) {
        setSelectedVoucher({
          ...selectedVoucher,
          raw: updatedExpense,
        });
      }

      setIsAttachmentModalVisible(false);
              updateLocalVoucherStatus(
                'PENDING',
              );
      handleRefresh();
      Alert.alert(
        'Upload successful',
        result.message,
        [
          {
            text: 'OK',
          },
        ],
      );
    };

  const handleApprove = () => {
    Alert.alert(
      'Approve voucher',
      'Are you sure you want to approve this voucher?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Approve',

          onPress: async () => {
            const result =
              await approveExpense({
                approvalRequestId,

                approverId:
                  employeeId,

                expenseCategoryId,

                remarks: 'Approved',
              });

            if (result.success) {
              updateLocalApprovalAfterApprove();
                updateLocalVoucherStatus(
                  'APPROVED',
                );

                /*
                * Refresh the Pending voucher list so
                * the rejected voucher is removed.
                */
                if (
                  employeeId > 0 &&
                  centreId > 0 &&
                  expenseCategoryId > 0
                ) {
                  await loadVouchers(
                    {
                      user_id: employeeId,
                      center_id: centreId,
                      category_id:
                        expenseCategoryId,
                      status: 'PENDING',
                      payment_mode: 'BANK',
                      page: 1,
                      limit: 20,
                    },
                    true,
                  );
                }
                Alert.alert(
                'Voucher approved',
                result.message,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      navigation.goBack();
                    },
                  },
                ],
              );
            } else {
              Alert.alert(
                'Unable to approve',
                result.message,
              );
            }
          },
        },
      ],
    );
  };

  const openRejectModal = async () => {
    setSelectedRejectionReason(null);
    setRejectionRemarks('');
    clearApprovalMessages();

    setIsRejectModalVisible(true);

    await loadRejectionReasons();
  };

  const closeRejectModal = () => {
    if (isSubmittingDecision) {
      return;
    }

    setIsRejectModalVisible(false);
    setSelectedRejectionReason(null);
    setRejectionRemarks('');
    clearApprovalMessages();
  };

const handleReject = async () => {
  if (!selectedRejectionReason) {
    Alert.alert(
      'Reason required',
      'Please select a rejection reason.',
    );

    return;
  }

  if (
    isOtherReasonSelected &&
    !rejectionRemarks.trim()
  ) {
    Alert.alert(
      'Remarks required',
      'Please enter a custom rejection reason.',
    );

    return;
  }

  const rejectionReasonName =
    getRejectionReasonLabel(
      selectedRejectionReason,
    );

  const finalRemarks =
    isOtherReasonSelected
      ? rejectionRemarks.trim()
      : rejectionReasonName;

  const isLocalOtherReason =
    selectedRejectionReason.id ===
    OTHER_REJECTION_REASON_ID;

  const result =
    await rejectExpense({
      approvalRequestId,
      approverId: employeeId,
      expenseCategoryId,

      /*
       * Predefined reason:
       * use reason name automatically.
       *
       * Other:
       * use manually entered remarks.
       */
      remarks: finalRemarks,

      rejectionReasonId:
        isLocalOtherReason
          ? null
          : selectedRejectionReason.id,

      rejectionReasonName,
    });

  if (result.success) {
    setIsRejectModalVisible(false);
    setSelectedRejectionReason(null);
    setRejectionRemarks('');

    updateLocalVoucherStatus(
      'REJECTED',
    );

    /*
    * Refresh the Pending voucher list so
    * the rejected voucher is removed.
    */
    if (
      employeeId > 0 &&
      centreId > 0 &&
      expenseCategoryId > 0
    ) {
      await loadVouchers(
        {
          user_id: employeeId,
          center_id: centreId,
          category_id:
            expenseCategoryId,
          status: 'PENDING',
          payment_mode: 'BANK',
          page: 1,
          limit: 20,
        },
        true,
      );
    }

    Alert.alert(
      'Voucher rejected',
      result.message,
      [
        {
          text: 'OK',
          onPress: () => {
            navigation.goBack();
          },
        },
      ],
    );
  } else {
      Alert.alert(
        'Unable to reject',
        result.message,
      );
    }
  };
  
  

  const handleOpenAttachment =
  async (
    attachment?:
      UploadedExpenseAttachment,
  ) => {
    const filePath = String(
      attachment?.file_path || '',
    ).trim();

    if (!filePath) {
      Alert.alert(
        'File unavailable',
        'The uploaded file path is missing.',
      );

      return;
    }

    const attachmentUrl =
      buildAttachmentUrl(filePath);

    if (!attachmentUrl) {
      Alert.alert(
        'File unavailable',
        'Unable to generate the attachment URL.',
      );

      return;
    }

    try {
      await Linking.openURL(
        encodeURI(attachmentUrl),
      );
    } catch (error) {
      console.error(
        'Unable to open attachment:',
        {
          attachmentUrl,
          error,
        },
      );

      Alert.alert(
        'Unable to open file',
        'The attachment could not be opened. Please verify that the file is available on the server.',
      );
    }
    };
  
    const handleRefresh =
  useCallback(async () => {
    await Promise.allSettled([
      loadExpenseDetails()
    ]);
  }, [
    loadExpenseDetails,
  ]);
  
  const findLatestReplyableQuery =
  useCallback(
    (
      commentItems: ExpenseComment[],
    ): ExpenseComment | null => {
      if (!isEmployeeUser) {
        return null;
      }

      const replyableQueries =
        commentItems.filter(item => {
          if (
            item.is_resolved ||
            Number(item.user_id) ===
              currentUserId
          ) {
            return false;
          }

          return isAdminOrDirectorComment(
            item,
          );
        });

      replyableQueries.sort(
        (first, second) =>
          new Date(
            second.created_at,
          ).getTime() -
          new Date(
            first.created_at,
          ).getTime(),
      );

      return (
        replyableQueries[0] ?? null
      );
    },
    [
      isEmployeeUser,
      currentUserId,
    ],
    );
  

    const loadExpenseComments =
    useCallback(async () => {
      if (expenseId <= 0) {
        setComments([]);
        setSelectedReplyComment(null);
        return;
      }

      try {
        setIsLoadingComments(true);
        setCommentsError('');

        const result =
          await expenseApi.getExpenseComments(
            expenseId,
          );

        const loadedComments:
          ExpenseComment[] =
          Array.isArray(result)
            ? result
            : [];

        console.log(
          'NORMALIZED EXPENSE COMMENTS',
          loadedComments,
        );

        /*
        * Display the complete comment list.
        * Do not filter comments based on
        * reply permissions.
        */
        setComments(loadedComments);

        /*
        * Filtering is only for selecting the
        * employee's reply target.
        */
        const latestReplyTarget =
          isEmployeeUser
            ? findLatestReplyableQuery(
                loadedComments,
              )
            : null;

        setSelectedReplyComment(
          latestReplyTarget,
        );
      } catch (error: any) {
        console.error(
          'Unable to load comments',
          {
            status:
              error?.response?.status,
            response:
              error?.response?.data,
            message: error?.message,
          },
        );

        setComments([]);
        setSelectedReplyComment(null);

        setCommentsError(
          error?.response?.data
            ?.message ||
            error?.message ||
            'Unable to load messages.',
        );
      } finally {
        setIsLoadingComments(false);
      }
    }, [
      expenseId,
      isEmployeeUser,
      findLatestReplyableQuery,
    ]);

useEffect(() => {
  if (!canUseMessaging) {
    setComments([]);
    setSelectedReplyComment(null);
    return;
  }

  void loadExpenseComments();
}, [
  canUseMessaging,
  loadExpenseComments,
]);
  
  const handlePickMessageAttachments =
  async () => {
    try {
      const result = await pick({
        allowMultiSelection: true,

        type: [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
      });

      const newFiles:
        MessageAttachmentFile[] =
        result
          .filter(file =>
            Boolean(file?.uri),
          )
          .map(file => ({
            uri: file.uri,

            name:
              file.name ||
              `attachment-${Date.now()}`,

            type:
              file.type ||
              'application/octet-stream',

            size: file.size,
          }));

      setMessageAttachments(
        currentFiles => {
          const uniqueFiles =
            new Map<
              string,
              MessageAttachmentFile
            >();

          [
            ...currentFiles,
            ...newFiles,
          ].forEach(file => {
            const key = [
              file.name,
              file.size ?? 0,
              file.uri,
            ].join('|');

            uniqueFiles.set(
              key,
              file,
            );
          });

          return Array.from(
            uniqueFiles.values(),
          );
        },
      );
    } catch (error: any) {
      const errorCode =
        error?.code ||
        error?.name;

      const isCancelled = [
        'DOCUMENT_PICKER_CANCELED',
        'OPERATION_CANCELED',
        'AbortError',
      ].includes(errorCode);

      if (isCancelled) {
        return;
      }

      Alert.alert(
        'Unable to select file',
        error?.message ||
          'Unable to select attachment.',
      );
    }
  };

  const canSubmitMessage =
    Boolean(commentText.trim()) || messageAttachments.length > 0;
  
  const getCommentAttachmentName = (
  attachment: any,
  index: number,
): string => {
  return String(
    attachment?.original_name ??
      attachment?.originalName ??
      attachment?.file_name ??
      attachment?.filename ??
      attachment?.name ??
      `Attachment ${index + 1}`,
  );
  };
  
const removeMessageAttachment = (
  indexToRemove: number,
) => {
  setMessageAttachments(
    currentFiles =>
      currentFiles.filter(
        (_, index) =>
          index !== indexToRemove,
      ),
  );
};
  
const handleSendMessage = async () => {
const message =
  commentText.trim();

const hasMessage =
  Boolean(message);

const hasAttachments =
  messageAttachments.length > 0;

if (
  !hasMessage &&
  !hasAttachments
) {
  Alert.alert(
    isEmployeeUser
      ? 'Reply required'
      : 'Query required',
    isEmployeeUser
      ? 'Please write a reply or attach a file.'
      : 'Please write a query or attach a file.',
  );

  return;
}

  if (!message) {
    Alert.alert(
      isEmployeeUser
        ? 'Reply required'
        : 'Query required',
      isEmployeeUser
        ? 'Please write a reply first.'
        : 'Please write a query first.',
    );

    return;
  }

  if (currentUserId <= 0) {
    Alert.alert(
      'Unable to send',
      'Logged-in user information is unavailable.',
    );

    return;
  }

  try {
    setIsSendingComment(true);

    let response: any;

    /*
     * Employee can only reply to an
     * Admin/Director query.
     */
    if (isEmployeeUser) {
      const replyTarget:
        ExpenseComment | null =
        selectedReplyComment ??
        findLatestReplyableQuery(
          comments,
        );

      if (!replyTarget) {
        Alert.alert(
          'Select query',
          'Please select an Admin or Director query before replying.',
        );

        return;
      }

      if (
        !isAdminOrDirectorComment(
          replyTarget,
        )
      ) {
        Alert.alert(
          'Invalid query',
          'Employee can reply only to an Admin or Director query.',
        );

        return;
      }

      const parentCommentId =
        Number(replyTarget.id || 0);

      const replyExpenseId =
        Number(
          replyTarget.expense_id ||
            expense?.id ||
            expenseId ||
            0,
        );

      if (parentCommentId <= 0) {
        Alert.alert(
          'Unable to reply',
          'The selected comment ID is unavailable.',
        );

        return;
      }

      if (replyExpenseId <= 0) {
        Alert.alert(
          'Unable to reply',
          'The expense ID is unavailable.',
        );

        return;
      }

      const formData =
        new FormData();

      formData.append(
        'parent_id',
        String(parentCommentId),
      );

      formData.append(
        'expense_id',
        String(replyExpenseId),
      );

      formData.append(
        'user_id',
        String(currentUserId),
      );

      formData.append(
        'message',
        message,
      );

      formData.append(
        'isResolved',
        'false',
      );
      messageAttachments.forEach(
      file => {
        formData.append(
          'files',
          {
            uri: file.uri,
            name: file.name,
            type: file.type,
          } as any,
        );
      },
    );

      console.log(
        'REPLY PAYLOAD',
        (formData as any)._parts,
      );

      response =
        await expenseApi
          .replyExpenseComment(
            formData,
          );
    } else {
      /*
       * Only Admin, Director and
       * Super Admin can raise queries.
       */
      if (!canRaiseQuery) {
        Alert.alert(
          'Not allowed',
          'You are not allowed to raise a query.',
        );

        return;
      }

      const queryExpenseId =
        Number(
          expense?.id ||
            expenseId ||
            0,
        );

      if (queryExpenseId <= 0) {
        Alert.alert(
          'Unable to send',
          'The expense ID is unavailable.',
        );

        return;
      }

      const voucherId = Number(
        expense?.payments?.[0]
          ?.voucher?.id || 0,
      );

      const formData =
        new FormData();

      formData.append(
        'expense_id',
        String(queryExpenseId),
      );

      formData.append(
        'voucher_id',
        voucherId > 0
          ? String(voucherId)
          : '',
      );

      if (approvalRequestId > 0) {
        formData.append(
          'approval_request_id',
          String(
            approvalRequestId,
          ),
        );
      }

      formData.append(
        'user_id',
        String(currentUserId),
      );

      formData.append(
        'message',
        message,
      );

      formData.append(
        'comment_type',
        'COMMENT',
      );

      messageAttachments.forEach(
        file => {
          formData.append(
            'files',
            {
              uri: file.uri,
              name: file.name,
              type: file.type,
            } as any,
          );
        },
      );

      console.log(
        'QUERY PAYLOAD',
        (formData as any)._parts,
      );

      response =
        await expenseApi
          .sendExpenseComment(
            formData,
          );
    }

    const isSuccess =
      Number(response?.status) ===
        1 ||
      response?.success === true;

    if (!isSuccess) {
      throw new Error(
        response?.message ||
          (isEmployeeUser
            ? 'Failed to send reply.'
            : 'Failed to raise query.'),
      );
    }

    setCommentText('');

    await loadExpenseComments();
    setMessageAttachments([]);


    Alert.alert(
      'Success',
      response?.message ||
        (isEmployeeUser
          ? 'Reply sent successfully.'
          : 'Query raised successfully.'),
    );
  } catch (error: any) {
    console.error(
      'Message sending failed:',
      {
        status:
          error?.response?.status,

        response:
          error?.response?.data,

        message:
          error?.message,
      },
    );

    Alert.alert(
      'Unable to send',
      error?.response?.data
        ?.message ||
        error?.message ||
        (isEmployeeUser
          ? 'Failed to send reply.'
          : 'Failed to raise query.'),
    );
  } finally {
    setIsSendingComment(false);
  }
};
  
const handleOpenMessageAttachment =
  async (attachment: any) => {
    const attachmentPath = String(
      attachment?.file_path ??
        attachment?.filePath ??
        attachment?.file_url ??
        attachment?.fileUrl ??
        attachment?.attachment_url ??
        attachment?.attachmentUrl ??
        attachment?.url ??
        attachment?.path ??
        '',
    ).trim();

    if (!attachmentPath) {
      Alert.alert(
        'Attachment unavailable',
        'The attachment URL is unavailable.',
      );

      return;
    }

    const attachmentUrl =
      buildAttachmentUrl(
        attachmentPath,
      );

    if (!attachmentUrl) {
      Alert.alert(
        'Attachment unavailable',
        'Unable to create the attachment URL.',
      );

      return;
    }

    try {
      /*
       * Encode spaces and special characters
       * inside the filename.
       */
      const browserUrl =
        encodeURI(attachmentUrl);

      console.log(
        'OPENING MESSAGE ATTACHMENT:',
        browserUrl,
      );

      /*
       * Do not use Linking.canOpenURL().
       * Open the browser directly.
       */
      await Linking.openURL(
        browserUrl,
      );
    } catch (error: any) {
      console.error(
        'Unable to open message attachment:',
        {
          attachment,
          attachmentUrl,
          message: error?.message,
        },
      );

      Alert.alert(
        'Unable to open attachment',
        error?.message ||
          'The attachment could not be opened.',
      );
    }
  };
  
if (!selectedVoucher) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.emptyContainer}>
        <MaterialDesignIcons
          name="file-alert-outline"
          size={48}
          color={Colors.textMuted}
        />

        <Text style={styles.emptyTitle}>
          Voucher not available
        </Text>

        <Text style={styles.emptyText}>
          Please return to the voucher list and select a voucher again.
        </Text>
      </View>
    </SafeAreaView>
  );
}

  const openMessageModal = async () => {
  if (!canUseMessaging) {
    Alert.alert(
      'Messaging unavailable',
      'Messaging is available only while the voucher is pending.',
    );

    return;
  }

  setIsMessageModalVisible(true);

  await loadExpenseComments();
  };

  const canResolveComment = useCallback(
  (
    comment: ExpenseComment,
  ): boolean => {
    if (!comment) {
      return false;
    }

    // Already resolved queries cannot be resolved again.
    if (comment.is_resolved) {
      return false;
    }

    // According to your Angular logic,
    // only Employee resolves the query.
    if (!isEmployeeUser) {
      return false;
    }

    // User cannot resolve their own comment.
    if (
      Number(comment.user_id) ===
      currentUserId
    ) {
      return false;
    }

    // Employee can resolve only an
    // Admin or Director root query.
    return isAdminOrDirectorComment(
      comment,
    );
  },
  [
    isEmployeeUser,
    currentUserId,
  ],
);
  
  const handleResolveComment = (
  comment: ExpenseComment,
) => {
  if (
    !canResolveComment(comment)
  ) {
    Alert.alert(
      'Resolve not allowed',
      'You cannot resolve this query.',
    );

    return;
  }

  const commentId =
    Number(comment.id || 0);

  if (commentId <= 0) {
    Alert.alert(
      'Unable to resolve',
      'The query ID is unavailable.',
    );

    return;
  }

  Alert.alert(
    'Resolve query',
    'Are you sure you want to mark this query as resolved?',
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Resolve',

        onPress: async () => {
          setResolvingCommentIds(
            currentIds => {
              const updatedIds =
                new Set(currentIds);

              updatedIds.add(
                commentId,
              );

              return updatedIds;
            },
          );

          try {
            const response =
              await expenseApi
                .resolveExpenseComment({
                  id: commentId,
                  resolved: true,
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
                  'Failed to resolve query.',
              );
            }

            if (
              Number(
                selectedReplyComment
                  ?.id,
              ) === commentId
            ) {
              setSelectedReplyComment(
                null,
              );
            }

            await Promise.all([
              loadExpenseComments(),
              loadExpenseDetails(
                false,
              ),
            ]);

            Alert.alert(
              'Query resolved',
              response?.message ||
                'The query was resolved successfully.',
            );
          } catch (error: any) {
            console.error(
              'Resolve query failed:',
              {
                status:
                  error?.response
                    ?.status,

                response:
                  error?.response
                    ?.data,

                message:
                  error?.message,
              },
            );

            Alert.alert(
              'Unable to resolve',
              error?.response?.data
                ?.message ||
                error?.message ||
                'Failed to resolve query.',
            );
          } finally {
            setResolvingCommentIds(
              currentIds => {
                const updatedIds =
                  new Set(currentIds);

                updatedIds.delete(
                  commentId,
                );

                return updatedIds;
              },
            );
          }
        },
      },
    ],
  );
};

const closeMessageModal = () => {
  if (isSendingComment) {
    return;
  }

  setIsMessageModalVisible(false);
};



  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['bottom']}>
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      
      keyboardShouldPersistTaps="handled"
          refreshControl={
          <RefreshControl
            refreshing={
              isRefreshing 
            }
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
          }>
        
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View style={styles.iconBox}>
              <MaterialDesignIcons
                name="receipt-text-outline"
                size={28}
                color={Colors.primary}
              />
            </View>

            <View
              style={styles.summaryContent}>
              <Text style={styles.voucherNo}>
                {selectedVoucher.voucherNo}
              </Text>

              <Text
                style={styles.categoryName}>
                {
                  selectedVoucher.categoryName
                }
              </Text>
            </View>

            <StatusBadge
              status={currentStatus}
            />

            {canUseMessaging ? (
            <Pressable
              hitSlop={10}
              onPress={openMessageModal}
              style={({pressed}) => [
                styles.messageIconButton,
                pressed && styles.pressed,
              ]}>
              <MaterialDesignIcons
                name="message-text-outline"
                size={22}
                color={Colors.primary}
              />

              {comments.length > 0 ? (
                <View
                  style={
                    styles.messageCountBadge
                  }>
                  <Text
                    style={
                      styles.messageCountText
                    }>
                    {comments.length > 99
                      ? '99+'
                      : comments.length}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          ) : null}

          </View>

          <View style={styles.amountRow}>
            <View>
              <Text
                style={styles.amountLabel}>
                Net payable
              </Text>

              <Text
                style={styles.amountValue}>
                ₹
                {Number(
                  selectedVoucher.netPayable ||
                    0,
                ).toLocaleString('en-IN')}
              </Text>
            </View>

            <View
              style={styles.paymentBadge}>
              <Text
                style={styles.paymentText}>
                {selectedVoucher.paymentMode ||
                  'Not available'}
              </Text>
            </View>
          </View>
        </View>

        {approvalActionError ? (
          <View style={styles.errorCard}>
            <MaterialDesignIcons
              name="alert-circle-outline"
              size={20}
              color={Colors.danger}
            />

            <Text style={styles.errorText}>
              {approvalActionError}
            </Text>
          </View>
        ) : null}

        <SectionCard title="Expense information">
          <DetailRow
            label="Expense ID"
            value={String(expense.id)}
          />

          <DetailRow
            label="Expense date"
            value={formatDate(
              expense.expense_date,
            )}
          />

          <DetailRow
            label="Vendor"
            value={
              expense.vendor?.vendorName ||
              expense.vendor_name ||
              selectedVoucher.beneficiaryName ||
              'Not available'
            }
          />

          <DetailRow
            label="Gross amount"
            value={formatCurrency(
              expense.gross_amount,
            )}
          />

          <DetailRow
            label="Discount"
            value={formatCurrency(
              expense.discount_amount,
            )}
          />

          <DetailRow
            label="TDS"
            value={formatCurrency(
              expense.tds_amount,
            )}
          />

          <DetailRow
            label="Narration"
            value={
              expense.remarks ||
              'No narration'
            }
            showDivider={false}
          />
        </SectionCard>

        <SectionCard title="Bank details">
          <DetailRow
            label="Beneficiary"
            value={
              firstBankDetail
                ?.beneficiary_name ||
              selectedVoucher.beneficiaryName ||
              'Not available'
            }
          />

          <DetailRow
            label="Bank"
            value={
              firstBankDetail?.bank_name ||
              'Not available'
            }
          />

          <DetailRow
            label="Account number"
            value={maskAccountNumber(
              firstBankDetail
                ?.account_number,
            )}
          />

          <DetailRow
            label="IFSC"
            value={
              firstBankDetail?.ifsc_code ||
              firstBankDetail?.ifsc ||
              'Not available'
            }
          />

          {/* <DetailRow
            label="Transaction reference"
            value={
              firstBankDetail
                ?.transaction_ref ||
              firstPayment
                ?.transaction_ref ||
              'Not available'
            }
            showDivider={false}
          /> */}
        </SectionCard>

        <SectionCard title="Approval summary">
          <DetailRow
            label="Approval request ID"
            value={
              approvalRequestId
                ? String(
                    approvalRequestId,
                  )
                : 'Not available'
            }
          />

          <DetailRow
            label="Approval mode"
            value={
              expense.approvalRequest
                ?.approvalMode ||
              expense.approvalRequest
                ?.approval_mode ||
              'Not available'
            }
          />
        <DetailRow
          label="Current level"
          value={
            currentApprovalLevel > 0
              ? `Level ${currentApprovalLevel}`
              : 'Completed'
          }
        />

          <DetailRow
            label="Approval status"
            value={currentStatus}
          />

          <DetailRow
            label="Current approver"
            value={
              currentApprovalLevel > 0
                ? normalizedApprovalLevels
                    .filter(
                      level =>
                        level.approvalLevel ===
                          currentApprovalLevel &&
                        !level.approved,
      
                    )
                    .map(
                      level =>
                        level.approverName,
                    )
                    .filter(Boolean)
                    .join(', ') ||
                  'Not available'
                : 'Not available'
            }
            showDivider={false}
          />
        </SectionCard>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            Approval timeline
          </Text>

          <View style={styles.timelineBody}>
            {timelineItems.length > 0 ? (
              timelineItems.map(
                (item, index) => (
                  <TimelineRow
                    key={item.id}
                    item={item}
                    isLast={
                      index ===
                      timelineItems.length -
                        1
                    }
                  />
                ),
              )
            ) : (
              <View
                style={
                  styles.emptyTimeline
                }>
                <MaterialDesignIcons
                  name="timeline-clock-outline"
                  size={34}
                  color={Colors.textMuted}
                />

                <Text
                  style={
                    styles.emptyTimelineTitle
                  }>
                  No approval activity
                </Text>

                <Text
                  style={
                    styles.emptyTimelineText
                  }>
                  Approval decisions will
                  appear here.
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View
            style={
              styles.attachmentHeader
            }>
            <View
              style={
                styles.attachmentHeaderContent
              }>
              <Text
                style={styles.sectionTitle}>
                Attachments
              </Text>

              <Text
                style={
                  styles.attachmentDescription
                }>
                Upload documents configured
                for this expense category.
              </Text>
            </View>

            {currentStatus ===
            'CREATED' && expense.status == 'CREATED' ? (
              <Pressable
                onPress={
                  openAttachmentModal
                }
                style={({pressed}) => [
                  styles.uploadAttachmentButton,
                  pressed &&
                    styles.pressed,
                ]}>
                <MaterialDesignIcons
                  name="paperclip-plus"
                  size={18}
                  color={Colors.primary}
                />

                <Text
                  style={
                    styles.uploadAttachmentButtonText
                  }>
                  Upload
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.attachmentBody}>
  {attachmentConfigs.length > 0 ? (
    attachmentConfigs.map(config => {
      const uploadedAttachment =
        uploadedAttachmentByType.get(
          normalizeAttachmentType(
            config.attachmentType,
          ),
        );

      const isUploaded = Boolean(
        uploadedAttachment?.file_path,
      );

      const isMandatory =
        !isSalaryCategory &&
        config.isMandatory;

      return (
        <Pressable
          key={config.attachmentType}
          disabled={!isUploaded}
          onPress={() =>
            handleOpenAttachment(
              uploadedAttachment,
            )
          }
          style={({pressed}) => [
            styles.attachmentStatusRow,

            isUploaded &&
              styles.attachmentClickableRow,

            pressed &&
              isUploaded &&
              styles.attachmentRowPressed,
          ]}>
          <View
            style={[
              styles.attachmentStatusIcon,

              isUploaded
                ? styles
                    .attachmentStatusIconSuccess
                : isMandatory
                  ? styles
                      .attachmentStatusIconDanger
                  : styles
                      .attachmentStatusIconOptional,
            ]}>
            <MaterialDesignIcons
              name={
                isUploaded
                  ? 'check'
                  : 'paperclip'
              }
              size={16}
              color={
                isUploaded
                  ? Colors.success
                  : isMandatory
                    ? Colors.danger
                    : Colors.textMuted
              }
            />
          </View>

          <View
            style={
              styles.attachmentStatusContent
            }>
            <Text
              style={
                styles.attachmentStatusName
              }>
              {config.attachmentType}
            </Text>

            <Text
              style={[
                styles.attachmentStatusLabel,

                isUploaded
                  ? {
                      color:
                        Colors.success,
                    }
                  : isMandatory
                    ? {
                        color:
                          Colors.danger,
                      }
                    : null,
              ]}>
              {isUploaded
                ? 'Uploaded · Tap to view'
                : isMandatory
                  ? 'Required'
                  : 'Optional'}
            </Text>
          </View>

          {isUploaded ? (
            <MaterialDesignIcons
              name="eye-outline"
              size={22}
              color={Colors.primary}
            />
          ) : null}
        </Pressable>
      );
    })
  ) : (
    <View
      style={
        styles.noAttachmentConfig
      }>
      <MaterialDesignIcons
        name="paperclip-off"
        size={26}
        color={Colors.textMuted}
      />

      <Text
        style={
          styles.noAttachmentConfigText
        }>
        No attachments are configured
        for this category.
      </Text>
    </View>
  )}
        </View>
        </View>

        <SectionCard title="Activity">
          <DetailRow
            label="Uploaded attachments"
            value={String(
              attachmentCount,
            )}
          />

          <DetailRow
            label="Comments"
            value={String(
              expense
                .total_comments_count ??
                expense.comments_count ??
                0,
            )}
          />

          <DetailRow
            label="Raise queries"
            value={String(
              expense
                .raised_query_count ?? 0,
            )}
          />

          <DetailRow
            label="Solved queries"
            value={String(
              expense
                .solved_query_count ?? 0,
            )}
            showDivider={false}
          />
        </SectionCard>

        {currentStatus === 'PENDING' &&
        !canApproveOrReject ? (
          <View style={styles.infoCard}>
            <MaterialDesignIcons
              name="information-outline"
              size={20}
              color={Colors.info}
            />

            <Text
              style={styles.infoCardText}>
              This voucher is waiting for
              approval from level{' '}
              {currentApprovalLevel || '-'}.
            </Text>
          </View>
        ) : null}

        {canSendForApproval &&  expense.status == 'CREATED'? (
          <Pressable
            disabled={
              isSendingForApproval
            }
            onPress={
              handleSendForApproval
            }
            style={({pressed}) => [
              styles.sendApprovalButton,

              isSendingForApproval &&
                styles.disabledButton,

              pressed &&
                !isSendingForApproval &&
                styles.pressed,
            ]}>
            {isSendingForApproval ? (
              <ActivityIndicator
                size="small"
                color={Colors.white}
              />
            ) : (
              <MaterialDesignIcons
                name="send-check-outline"
                size={22}
                color={Colors.white}
              />
            )}

            <Text
              style={
                styles.sendApprovalButtonText
              }>
              {isSendingForApproval
                ? 'Sending...'
                : 'Send for Approval'}
            </Text>
          </Pressable>
        ) : null}

        {canApproveOrReject ? (
          <View
            style={
              styles.decisionActions
            }>
            <Pressable
              disabled={
                isSubmittingDecision
              }
              onPress={openRejectModal}
              style={({pressed}) => [
                styles.rejectButton,

                isSubmittingDecision &&
                  styles.disabledButton,

                pressed &&
                  !isSubmittingDecision &&
                  styles.pressed,
              ]}>
              <MaterialDesignIcons
                name="close-circle-outline"
                size={21}
                color={Colors.danger}
              />

              <Text
                style={
                  styles.rejectButtonText
                }>
                Reject
              </Text>
            </Pressable>

            <Pressable
              disabled={
                isSubmittingDecision
              }
              onPress={handleApprove}
              style={({pressed}) => [
                styles.approveButton,

                isSubmittingDecision &&
                  styles.disabledButton,

                pressed &&
                  !isSubmittingDecision &&
                  styles.pressed,
              ]}>
              {isSubmittingDecision ? (
                <ActivityIndicator
                  size="small"
                  color={Colors.white}
                />
              ) : (
                <MaterialDesignIcons
                  name="check-decagram-outline"
                  size={21}
                  color={Colors.white}
                />
              )}

              <Text
                style={
                  styles.approveButtonText
                }>
                Approve
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <Modal
        visible={
          isAttachmentModalVisible
        }
        transparent
        animationType="slide"
        onRequestClose={
          closeAttachmentModal
        }>
        <View
          style={styles.modalContainer}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={
              closeAttachmentModal
            }
          />

          <View
            style={
              styles.attachmentModalSheet
            }>
            <View
              style={styles.modalHandle}
            />

            <View
              style={styles.modalHeader}>
              <View
                style={
                  styles.modalTitleArea
                }>
                <Text
                  style={styles.modalTitle}>
                  Upload attachments
                </Text>

                <Text
                  style={
                    styles.modalSubtitle
                  }>
                  Select documents for each
                  attachment type.
                </Text>
              </View>

              <Pressable
                disabled={isUploading}
                style={[
                  styles.modalClose,
                  isUploading && styles.disabledButton,
                ]}
                onPress={closeAttachmentModal}>
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
              showsVerticalScrollIndicator={
                false
              }
              keyboardShouldPersistTaps="handled">
              {attachmentConfigs.length >
              0 ? (
                attachmentConfigs.map(
                  config => {
                    const selectedFile =
                      selectedFiles[
                        config
                          .attachmentType
                      ];

                    const alreadyUploaded =
                      uploadedAttachmentTypes.has(
                        config.attachmentType,
                      );

                    const isMandatory =
                      !isSalaryCategory &&
                      config.isMandatory;

                    return (
                      <View
                        key={
                          config.attachmentType
                        }
                        style={
                          styles.attachmentPickerCard
                        }>
                        <View
                          style={
                            styles.attachmentPickerHeader
                          }>
                          <View
                            style={
                              styles.attachmentPickerTitleArea
                            }>
                            <Text
                              style={
                                styles.attachmentPickerTitle
                              }>
                              {
                                config.attachmentType
                              }
                            </Text>

                            <Text
                              style={[
                                styles.attachmentPickerRequirement,

                                isMandatory
                                  ? {
                                      color:
                                        Colors.danger,
                                    }
                                  : null,
                              ]}>
                              {isMandatory
                                ? 'Mandatory'
                                : 'Optional'}
                            </Text>
                          </View>

                          {alreadyUploaded ? (
                            <View
                              style={
                                styles.uploadedBadge
                              }>
                              <MaterialDesignIcons
                                name="check-circle"
                                size={15}
                                color={
                                  Colors.success
                                }
                              />

                              <Text
                                style={
                                  styles.uploadedBadgeText
                                }>
                                Uploaded
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        {selectedFile ? (
                          <View
                            style={
                              styles.selectedAttachmentFile
                            }>
                            <View
                              style={
                                styles.selectedAttachmentIcon
                              }>
                              <MaterialDesignIcons
                                name="file-document-outline"
                                size={22}
                                color={
                                  Colors.primary
                                }
                              />
                            </View>

                            <View
                              style={
                                styles.selectedAttachmentContent
                              }>
                              <Text
                                style={
                                  styles.selectedAttachmentName
                                }
                                numberOfLines={
                                  1
                                }>
                                {
                                  selectedFile.name
                                }
                              </Text>

                              <Text
                                style={
                                  styles.selectedAttachmentSize
                                }>
                                {formatFileSize(
                                  selectedFile.size,
                                )}
                              </Text>
                            </View>

                              <Pressable
                                hitSlop={10}
                                disabled={isUploading}
                                onPress={() =>
                                  removeSelectedFile(config.attachmentType)
                                }>
                              <MaterialDesignIcons
                                name="delete-outline"
                                size={22}
                                color={
                                  Colors.danger
                                }
                              />
                            </Pressable>
                          </View>
                        ) : (
                          <Pressable
                            disabled={isUploading}
                            onPress={() =>
                              handlePickAttachment(config.attachmentType)
                            }
                            style={({ pressed }) => [
                              styles.chooseAttachmentButton,
                              isUploading && styles.disabledButton,
                              pressed && !isUploading && styles.pressed,
                            ]}>
                            <MaterialDesignIcons
                              name="file-upload-outline"
                              size={20}
                              color={
                                Colors.primary
                              }
                            />

                            <Text
                              style={
                                styles.chooseAttachmentButtonText
                              }>
                              {alreadyUploaded
                                ? 'Replace file'
                                : 'Choose file'}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    );
                  },
                )
              ) : (
                <View
                  style={
                    styles.noAttachmentModal
                  }>
                  <MaterialDesignIcons
                    name="paperclip-off"
                    size={42}
                    color={
                      Colors.textMuted
                    }
                  />

                  <Text
                    style={
                      styles.noAttachmentModalText
                    }>
                    No attachment types are
                    configured.
                  </Text>
                </View>
              )}

              {uploadError ? (
                <View
                  style={
                    styles.modalErrorCard
                  }>
                  <MaterialDesignIcons
                    name="alert-circle-outline"
                    size={18}
                    color={Colors.danger}
                  />

                  <Text
                    style={
                      styles.modalErrorText
                    }>
                    {uploadError}
                  </Text>
                </View>
              ) : null}

              <View
                style={
                  styles.modalActions
                }>
                <Pressable
                  disabled={isUploading}
                  onPress={
                    closeAttachmentModal
                  }
                  style={
                    styles.cancelButton
                  }>
                  <Text
                    style={
                      styles.cancelButtonText
                    }>
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  disabled={
                    isUploading ||
                    !hasAnySelectedAttachment
                  }
                  onPress={
                    handleUploadAttachments
                  }
                  style={[
                    styles.uploadFilesButton,

                    (isUploading ||
                      !hasAnySelectedAttachment) &&
                      styles.disabledButton,
                  ]}>
                  {isUploading ? (
                    <ActivityIndicator
                      size="small"
                      color={Colors.white}
                    />
                  ) : (
                    <MaterialDesignIcons
                      name="cloud-upload-outline"
                      size={20}
                      color={Colors.white}
                    />
                  )}

                  <Text
                    style={
                      styles.uploadFilesButtonText
                    }>
                    {isUploading
                      ? 'Uploading...'
                      : 'Upload & Submit'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Reject Modal */}
    <Modal
      visible={isRejectModalVisible}
      transparent
      animationType="slide"
      onRequestClose={
        closeRejectModal
      }>
    <View style={styles.modalContainer}>
      <Pressable
        style={styles.modalBackdrop}
        onPress={closeRejectModal}
      />

    <View style={styles.modalSheet}>
      <View style={styles.modalHandle} />

      <View style={styles.modalHeader}>
        <View
          style={
            styles.modalTitleArea
          }>
          <Text style={styles.modalTitle}>
            Reject voucher
          </Text>

          <Text
            style={
              styles.modalSubtitle
            }>
            Select a rejection reason or
            Choose a
            custom reason.
          </Text>
        </View>

        <Pressable
          style={styles.modalClose}
          onPress={closeRejectModal}>
          <MaterialDesignIcons
            name="close"
            size={22}
            color={Colors.textPrimary}
          />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled">
        {isLoadingRejectionReasons ? (
          <View
            style={
              styles.reasonLoading
            }>
            <ActivityIndicator
              size="small"
              color={Colors.primary}
            />

            <Text
              style={
                styles.reasonLoadingText
              }>
              Loading rejection
              reasons...
            </Text>
          </View>
        ) : (
          <>
            {rejectionReasonError ? (
              <View
                style={
                  styles.reasonError
                }>
                <Text
                  style={
                    styles.reasonErrorText
                  }>
                  {rejectionReasonError}
                </Text>

                <Pressable
                  onPress={() =>
                    loadRejectionReasons(
                      true,
                    )
                  }>
                  <Text
                    style={
                      styles.reasonRetryText
                    }>
                    Retry
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <View
              style={
                styles.reasonList
              }>
              {displayedRejectionReasons.map(
                reason => {
                  const isSelected =
                    selectedRejectionReason
                      ?.id === reason.id;

                  const isOther =
                    isOtherRejectionReason(
                      reason,
                    );

                  return (
                    <Pressable
                      key={String(
                        reason.id,
                      )}
                      onPress={() => {
                        setSelectedRejectionReason(
                          reason,
                        );

                        /*
                         * Remarks are used only
                         * for the Other option.
                         */
                        if (!isOther) {
                          setRejectionRemarks(
                            '',
                          );
                        }
                      }}
                      style={({
                        pressed,
                      }) => [
                        styles.reasonItem,

                        isSelected &&
                          styles
                            .reasonItemSelected,

                        pressed &&
                          styles.pressed,
                      ]}>
                      <View
                        style={[
                          styles.radioOuter,

                          isSelected &&
                            styles
                              .radioOuterSelected,
                        ]}>
                        {isSelected ? (
                          <View
                            style={
                              styles.radioInner
                            }
                          />
                        ) : null}
                      </View>

                      <View
                        style={
                          styles
                            .reasonTextContainer
                        }>
                        <Text
                          style={[
                            styles.reasonText,

                            isSelected &&
                              styles
                                .reasonTextSelected,
                          ]}>
                          {getRejectionReasonLabel(
                            reason,
                          )}
                        </Text>

                        {isOther ? (
                          <Text
                            style={
                              styles
                                .otherReasonHint
                            }>
                            Enter a custom
                            rejection reason
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                },
              )}
            </View>
          </>
        )}

        {isOtherReasonSelected ? (
          <>
            <Text
              style={[
                styles.inputLabel,
                styles.remarksLabel,
              ]}>
              Custom rejection reason
            </Text>

            <TextInput
              value={rejectionRemarks}
              onChangeText={
                setRejectionRemarks
              }
              placeholder="Enter custom rejection reason"
              placeholderTextColor={
                Colors.textMuted
              }
              multiline
              maxLength={500}
              textAlignVertical="top"
              style={styles.remarksInput}
            />

            <Text
              style={
                styles.characterCount
              }>
              {rejectionRemarks.length}/500
            </Text>
          </>
        ) : null}

        {approvalActionError ? (
          <View
            style={
              styles.modalErrorCard
            }>
            <MaterialDesignIcons
              name="alert-circle-outline"
              size={18}
              color={Colors.danger}
            />

            <Text
              style={
                styles.modalErrorText
              }>
              {approvalActionError}
            </Text>
          </View>
        ) : null}

        <View
          style={
            styles.modalActions
          }>
          <Pressable
            disabled={
              isSubmittingDecision
            }
            onPress={
              closeRejectModal
            }
            style={
              styles.cancelButton
            }>
            <Text
              style={
                styles.cancelButtonText
              }>
              Cancel
            </Text>
          </Pressable>

        <Pressable
          disabled={!canSubmitRejection}
          onPress={handleReject}
          style={[
            styles.confirmRejectButton,
            !canSubmitRejection &&
              styles.disabledButton,
          ]}>
            {isSubmittingDecision ? (
              <ActivityIndicator
                size="small"
                color={Colors.white}
              />
            ) : (
              <MaterialDesignIcons
                name="close-circle-outline"
                size={20}
                color={Colors.white}
              />
            )}

            <Text
              style={
                styles
                  .confirmRejectButtonText
              }>
              {isSubmittingDecision
                ? 'Rejecting...'
                : 'Reject Voucher'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  </View>
      </Modal>
      
      {/* Message modal */}
      <Modal
        visible={isMessageModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeMessageModal}>
        <View style={styles.modalContainer}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={closeMessageModal}
          />

      <View
        style={[
          styles.messageModalSheet,
          {
            paddingBottom: Math.max(insets.bottom + 14, 30),
          },
        ]}>
        <View style={styles.modalHandle} />

        <View style={styles.modalHeader}>
          <View style={styles.modalTitleArea}>
            <Text style={styles.modalTitle}>Voucher messages</Text>

            <Text style={styles.modalSubtitle}>
              Queries and replies for this expense.
            </Text>
          </View>

          <Pressable
            style={styles.modalClose}
            onPress={closeMessageModal}>
            <MaterialDesignIcons
              name="close"
              size={22}
              color={Colors.textPrimary}
            />
          </Pressable>
        </View>

        {isLoadingComments ? (
          <View style={styles.messageLoading}>
            <ActivityIndicator size="small" color={Colors.primary} />

            <Text style={styles.messageLoadingText}>
              Loading messages...
            </Text>
          </View>
        ) : commentsError ? (
          <View style={styles.messageErrorCard}>
            <MaterialDesignIcons
              name="alert-circle-outline"
              size={20}
              color={Colors.danger}
            />

            <Text style={styles.messageErrorText}>{commentsError}</Text>

            <Pressable onPress={loadExpenseComments}>
              <Text style={styles.messageRetryText}>Retry</Text>
            </Pressable>
          </View>
        ) : comments.length === 0 ? (
          <View style={styles.emptyMessages}>
            <MaterialDesignIcons
              name="message-outline"
              size={42}
              color={Colors.textMuted}
            />

            <Text style={styles.emptyMessagesTitle}>No messages yet</Text>

            <Text style={styles.emptyMessagesText}>
              Queries and replies will appear here.
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.messageList}>
            {comments.map(comment => (
              <View
                key={String(comment.id)}
                style={styles.messageThread}>
                <View style={styles.messageCard}>
                  <View style={styles.messageHeaderRow}>
                    <View style={styles.messageHeaderContent}>
                      <Text style={styles.messageSender}>
                        {comment.employee_name ||
                          `User #${comment.user_id}`}
                      </Text>

                      <Text style={styles.messageRole}>
                        {comment.user_type || 'User'}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.commentStatusBadge,
                        comment.is_resolved
                          ? styles.commentResolvedStatus
                          : styles.commentOpenStatus,
                      ]}>
                      <Text
                        style={[
                          styles.commentStatusText,
                          comment.is_resolved
                            ? styles.commentResolvedStatusText
                            : styles.commentOpenStatusText,
                        ]}>
                        {comment.is_resolved ? 'RESOLVED' : 'OPEN'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.messageBody}>
                    {comment.message || 'Attachment only'}
                  </Text>

                  {Array.isArray(
                    comment.attachments,
                  ) &&
                  comment.attachments.length > 0 ? (
                    <View
                      style={
                        styles.commentAttachmentList
                      }>
                      {comment.attachments.map(
                        (
                          attachment:
                            ExpenseMessageAttachment,
                          attachmentIndex:
                            number,
                        ) => {
                          const attachmentName =
                            getMessageAttachmentName(
                              attachment,
                              attachmentIndex,
                            );

                          return (
                            <Pressable
                              key={String(
                                attachment.id ??
                                  `${comment.id}-${attachmentIndex}`,
                              )}
                              onPress={() =>
                                handleOpenMessageAttachment(
                                  attachment,
                                )
                              }
                              style={({pressed}) => [
                                styles.commentAttachmentButton,
                                pressed &&
                                  styles.pressed,
                              ]}>
                              <View
                                style={
                                  styles.commentAttachmentIcon
                                }>
                                <MaterialDesignIcons
                                  name="file-document-outline"
                                  size={20}
                                  color={Colors.primary}
                                />
                              </View>

                              <View
                                style={
                                  styles.commentAttachmentContent
                                }>
                                <Text
                                  numberOfLines={1}
                                  style={
                                    styles.commentAttachmentName
                                  }>
                                  {attachmentName}
                                </Text>

                                <Text
                                  style={
                                    styles.commentAttachmentAction
                                  }>
                                  Click to view attachment
                                </Text>
                              </View>

                              <MaterialDesignIcons
                                name="open-in-new"
                                size={18}
                                color={Colors.primary}
                              />
                            </Pressable>
                          );
                        },
                      )}
                    </View>
                  ) : null}
                  
                  {Array.isArray(comment.attachments) &&
                  comment.attachments.length > 0 ? (
                    <View style={styles.receivedAttachmentList}>
                      {comment.attachments.map(
                        (attachment: any, attachmentIndex: number) => (
                          <View
                            key={`comment-${comment.id}-attachment-${attachmentIndex}`}
                            style={styles.receivedAttachmentChip}>
                            <MaterialDesignIcons
                              name="paperclip"
                              size={16}
                              color={Colors.primary}
                            />

                            <Text
                              numberOfLines={1}
                              style={styles.receivedAttachmentName}>
                              {getCommentAttachmentName(
                                attachment,
                                attachmentIndex,
                              )}
                            </Text>
                          </View>
                        ),
                      )}
                    </View>
                  ) : null}

                  <Text style={styles.messageDate}>
                    {formatDateTime(comment.created_at)}
                  </Text>

                  <View style={styles.commentActionRow}>
                    {canEmployeeReply(comment) ? (
                      <Pressable
                        onPress={() => setSelectedReplyComment(comment)}
                        style={({pressed}) => [
                          styles.commentReplyButton,
                          Number(selectedReplyComment?.id ?? 0) ===
                            Number(comment.id) &&
                            styles.commentReplyButtonSelected,
                          pressed && styles.pressed,
                        ]}>
                        <MaterialDesignIcons
                          name="reply-outline"
                          size={17}
                          color={Colors.primary}
                        />

                        <Text style={styles.commentReplyButtonText}>
                          {Number(selectedReplyComment?.id ?? 0) ===
                          Number(comment.id)
                            ? 'Selected'
                            : 'Reply'}
                        </Text>
                      </Pressable>
                    ) : null}

                    {canResolveComment(comment) ? (
                      <Pressable
                        disabled={resolvingCommentIds.has(
                          Number(comment.id),
                        )}
                        onPress={() => handleResolveComment(comment)}
                        style={({pressed}) => [
                          styles.commentResolveButton,
                          resolvingCommentIds.has(Number(comment.id)) &&
                            styles.disabledButton,
                          pressed &&
                            !resolvingCommentIds.has(Number(comment.id)) &&
                            styles.pressed,
                        ]}>
                        {resolvingCommentIds.has(Number(comment.id)) ? (
                          <ActivityIndicator
                            size="small"
                            color={Colors.success}
                          />
                        ) : (
                          <MaterialDesignIcons
                            name="check-circle-outline"
                            size={17}
                            color={Colors.success}
                          />
                        )}

                        <Text style={styles.commentResolveButtonText}>
                          {resolvingCommentIds.has(Number(comment.id))
                            ? 'Resolving...'
                            : 'Resolve'}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>

                {Array.isArray(comment.replies)
                  ? comment.replies.map(reply => (
                      <View key={String(reply.id)} style={styles.replyCard}>
                        <View style={styles.replyHeaderRow}>
                          <Text style={styles.replySender}>
                            {reply.employee_name || `User #${reply.user_id}`}
                          </Text>

                          <Text style={styles.replyRole}>
                            {reply.user_type || 'Employee'}
                          </Text>
                        </View>

                        <Text style={styles.messageBody}>
                          {reply.message || 'Attachment only'}
                        </Text>

                      {Array.isArray(
                        reply.attachments,
                      ) &&
                      reply.attachments.length > 0 ? (
                        <View
                          style={
                            styles.commentAttachmentList
                          }>
                          {reply.attachments.map(
                            (
                              attachment:
                                ExpenseMessageAttachment,
                              attachmentIndex:
                                number,
                            ) => {
                              const attachmentName =
                                getMessageAttachmentName(
                                  attachment,
                                  attachmentIndex,
                                );

                              return (
                                <Pressable
                                  key={String(
                                    attachment.id ??
                                      `${reply.id}-${attachmentIndex}`,
                                  )}
                                  onPress={() =>
                                    handleOpenMessageAttachment(
                                      attachment,
                                    )
                                  }
                                  style={({pressed}) => [
                                    styles.commentAttachmentButton,
                                    pressed &&
                                      styles.pressed,
                                  ]}>
                                  <View
                                    style={
                                      styles.commentAttachmentIcon
                                    }>
                                    <MaterialDesignIcons
                                      name="file-document-outline"
                                      size={20}
                                      color={Colors.primary}
                                    />
                                  </View>

                                  <View
                                    style={
                                      styles.commentAttachmentContent
                                    }>
                                    <Text
                                      numberOfLines={1}
                                      style={
                                        styles.commentAttachmentName
                                      }>
                                      {attachmentName}
                                    </Text>

                                    <Text
                                      style={
                                        styles.commentAttachmentAction
                                      }>
                                      Click to view attachment
                                    </Text>
                                  </View>

                                  <MaterialDesignIcons
                                    name="open-in-new"
                                    size={18}
                                    color={Colors.primary}
                                  />
                                </Pressable>
                              );
                            },
                          )}
                        </View>
                      ) : null}
                        {Array.isArray(reply.attachments) &&
                        reply.attachments.length > 0 ? (
                          <View style={styles.receivedAttachmentList}>
                            {reply.attachments.map(
                              (
                                attachment: any,
                                attachmentIndex: number,
                              ) => (
                                <View
                                  key={`reply-${reply.id}-attachment-${attachmentIndex}`}
                                  style={styles.receivedAttachmentChip}>
                                  <MaterialDesignIcons
                                    name="paperclip"
                                    size={16}
                                    color={Colors.primary}
                                  />

                                  <Text
                                    numberOfLines={1}
                                    style={styles.receivedAttachmentName}>
                                    {getCommentAttachmentName(
                                      attachment,
                                      attachmentIndex,
                                    )}
                                  </Text>
                                </View>
                              ),
                            )}
                          </View>
                        ) : null}

                        <Text style={styles.messageDate}>
                          {formatDateTime(reply.created_at)}
                        </Text>
                      </View>
                    ))
                  : null}
              </View>
            ))}
          </ScrollView>
        )}

        {isEmployeeUser && selectedReplyComment ? (
          <View style={styles.replyingToCard}>
            <MaterialDesignIcons
              name="reply-outline"
              size={18}
              color={Colors.primary}
            />

            <View style={styles.replyingToContent}>
              <Text style={styles.replyingToLabel}>Replying to</Text>

              <Text style={styles.replyingToName} numberOfLines={1}>
                {selectedReplyComment.employee_name ||
                  `User #${selectedReplyComment.user_id}`}
              </Text>
            </View>

            <Pressable
              hitSlop={8}
              disabled={isSendingComment}
              onPress={() => setSelectedReplyComment(null)}>
              <MaterialDesignIcons
                name="close-circle"
                size={20}
                color={Colors.textMuted}
              />
            </Pressable>
          </View>
        ) : null}

        {isEmployeeUser &&
        !isLoadingComments &&
        !selectedReplyComment ? (
          <View style={styles.noReplyQueryCard}>
            <MaterialDesignIcons
              name="information-outline"
              size={18}
              color={Colors.info}
            />

            <Text style={styles.noReplyQueryText}>
              Select an unresolved Admin or Director query before replying.
            </Text>
          </View>
        ) : null}

        {messageAttachments.length > 0 ? (
          <View style={styles.messageAttachmentList}>
            {messageAttachments.map((file, index) => (
              <View
                key={`${file.uri}-${index}`}
                style={styles.messageAttachmentChip}>
                <MaterialDesignIcons
                  name="file-document-outline"
                  size={18}
                  color={Colors.primary}
                />

                <Text
                  numberOfLines={1}
                  style={styles.messageAttachmentName}>
                  {file.name}
                </Text>

                <Pressable
                  hitSlop={8}
                  disabled={isSendingComment}
                  onPress={() => removeMessageAttachment(index)}>
                  <MaterialDesignIcons
                    name="close-circle"
                    size={19}
                    color={Colors.danger}
                  />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {isEmployeeUser || canRaiseQuery ? (
          <View style={styles.messageComposer}>
            <Pressable
              disabled={
                isSendingComment ||
                (isEmployeeUser && !selectedReplyComment)
              }
              onPress={handlePickMessageAttachments}
              style={({pressed}) => [
                styles.messageAttachButton,
                (isSendingComment ||
                  (isEmployeeUser && !selectedReplyComment)) &&
                  styles.disabledButton,
                pressed &&
                  !isSendingComment &&
                  (!isEmployeeUser || Boolean(selectedReplyComment)) &&
                  styles.pressed,
              ]}>
              <MaterialDesignIcons
                name="paperclip"
                size={25}
                color={Colors.primary}
              />

              {messageAttachments.length > 0 ? (
                <View style={styles.messageAttachmentCount}>
                  <Text style={styles.messageAttachmentCountText}>
                    {messageAttachments.length}
                  </Text>
                </View>
              ) : null}
            </Pressable>

            <TextInput
              value={commentText}
              onChangeText={setCommentText}
              editable={
                !isSendingComment &&
                (!isEmployeeUser || Boolean(selectedReplyComment))
              }
              multiline
              maxLength={1000}
              placeholder={
                isEmployeeUser ? 'Write your reply...' : 'Write a query...'
              }
              placeholderTextColor={Colors.textMuted}
              textAlignVertical="top"
              style={styles.messageInput}
            />

            <Pressable
              disabled={
                isLoadingComments ||
                isSendingComment ||
                !canSubmitMessage ||
                (isEmployeeUser && !selectedReplyComment)
              }
              onPress={handleSendMessage}
              style={({pressed}) => [
                styles.messageSendButton,
                (isLoadingComments ||
                  isSendingComment ||
                  !canSubmitMessage ||
                  (isEmployeeUser && !selectedReplyComment)) &&
                  styles.disabledButton,
                pressed &&
                  !isLoadingComments &&
                  !isSendingComment &&
                  canSubmitMessage &&
                  (!isEmployeeUser || Boolean(selectedReplyComment)) &&
                  styles.pressed,
              ]}>
              {isSendingComment ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <MaterialDesignIcons
                  name="send"
                  size={20}
                  color={Colors.white}
                />
              )}
            </Pressable>
          </View>
        ) : null}
      </View>
      </View>
      </Modal>
    </SafeAreaView>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>
        {title}
      </Text>

      <View style={styles.sectionBody}>
        {children}
      </View>
    </View>
  );
}

function DetailRow({
  label,
  value,
  showDivider = true,
}: {
  label: string;
  value: string;
  showDivider?: boolean;
}) {
  return (
    <View
      style={[
        styles.detailRow,

        showDivider &&
          styles.detailDivider,
      ]}>
      <Text style={styles.detailLabel}>
        {label}
      </Text>

      <Text style={styles.detailValue}>
        {value}
      </Text>
    </View>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const statusConfig =
    getStatusConfig(status);

  return (
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
            color: statusConfig.color,
          },
        ]}>
        {status || 'UNKNOWN'}
      </Text>
    </View>
  );
}

function TimelineRow({
  item,
  isLast,
}: {
  item: TimelineItem;
  isLast: boolean;
}) {
  const config = getStatusConfig(
    item.decision,
  );

const decision = String(item.decision || '')
  .trim()
  .toUpperCase();

const iconName:
  | 'account-plus-outline'
  | 'check'
  | 'close'
  | 'clock-outline'
  | 'minus-circle-outline' =
  item.isCreator
    ? 'account-plus-outline'
    : decision === 'APPROVED'
      ? 'check'
      : decision === 'REJECTED'
        ? 'close'
        : decision === 'NOT_REQUIRED'
          ? 'minus-circle-outline'
          : 'clock-outline';

  return (
    <View style={styles.timelineRow}>
      <View
        style={styles.timelineIndicator}>
        <View
          style={[
            styles.timelineDot,

            {
              backgroundColor:
                config.color,
            },
          ]}>
          <MaterialDesignIcons
            name={iconName}
            size={13}
            color={Colors.white}
          />
        </View>

        {!isLast ? (
          <View
            style={styles.timelineLine}
          />
        ) : null}
      </View>

      <View
        style={styles.timelineContent}>
        <View style={styles.timelineTop}>
          <View
            style={
              styles.timelineNameArea
            }>
            <Text
              style={styles.timelineName}>
              {item.approverName}
            </Text>

            {item.approverRole ? (
              <Text
                style={
                  styles.timelineRole
                }>
                {item.approverRole}
              </Text>
            ) : null}
          </View>

          <Text
            style={[
              styles.timelineDecision,

              {
                color: config.color,
              },
            ]}>
            {item.decision}
          </Text>
        </View>

      <Text
        style={[
          styles.timelineDecision,
          item.isCreator &&
            styles.timelineCreatedDecision,
        ]}>
        {item.isCreator
          ? 'CREATED'
          : item.decision}
      </Text>

        {!item.isCreator &&
        item.isDirector ? (
          <Text
            style={styles.timelineMeta}>
            Director approval
          </Text>
        ) : null}

        {!item.isCreator &&
        item.isMandatory ? (
          <Text
            style={styles.timelineMeta}>
            Mandatory approval
          </Text>
        ) : null}

        {item.remarks ? (
          <Text
            style={
              styles.timelineRemarks
            }>
            {item.remarks}
          </Text>
        ) : null}

        <Text
          style={styles.timelineDate}>
          {item.createdAt
            ? formatDateTime(
                item.createdAt,
              )
            : item.decision === 'PENDING'
              ? 'Waiting for approval'
              : null}
        </Text>
      </View>
    </View>
  );
}

function getApprovalTimeline(
  approvalHistory: any,
  approvalLevels: any,
  expenseStatusValue?: any,
  approvalDecisions?: any,
): TimelineItem[] {
  const historyList = Array.isArray(approvalHistory)
    ? approvalHistory
    : [];

  const levelList = Array.isArray(approvalLevels)
    ? approvalLevels
    : [];

  const decisionList = Array.isArray(approvalDecisions)
    ? approvalDecisions
    : [];

  const expenseStatus = String(expenseStatusValue || '')
    .trim()
    .toUpperCase();

  /*
   * Use approval_decisions as source of truth.
   * If approval_decisions is missing, fall back to approvalHistory final decisions.
   */
  const actualDecisionList =
    decisionList.length > 0
      ? decisionList
      : historyList.filter((history: any) => {
          const decision = String(
            history?.decision || history?.status || '',
          )
            .trim()
            .toUpperCase();

          return (
            decision === 'APPROVED' ||
            decision === 'REJECTED'
          );
        });

  const timeline: TimelineItem[] = [];

  /*
   * Creator item from approval history
   */
  historyList.forEach((history: any, index: number) => {
    const historyType = String(history?.type || '')
      .trim()
      .toLowerCase();

    const status = String(
      history?.status ||
        history?.decision ||
        history?.type ||
        '',
    )
      .trim()
      .toUpperCase();

    const isCreator =
      historyType === 'created' ||
      status === 'CREATED';

    if (!isCreator) {
      return;
    }

    const userName = String(
      history?.user_name ||
        history?.userName ||
        history?.created_by_name ||
        history?.createdByName ||
        history?.employee_name ||
        '',
    ).trim();

    timeline.push({
      id: String(
        history?.id ||
          `creator-${index}`,
      ),

      level: 0,

      approverName:
        userName || 'Voucher Creator',

      approverRole:
        history?.user_type_name ||
        history?.userTypeName ||
        'Created by',

      decision: 'CREATED',

      remarks: String(
        history?.remarks ||
          history?.comment ||
          '',
      ).trim(),

      createdAt: String(
        history?.created_at ||
          history?.createdAt ||
          history?.updated_at ||
          history?.updatedAt ||
          '',
      ),

      isCreator: true,
      isMandatory: false,
      isDirector: false,
    });
  });

  /*
   * If final status is APPROVED, show only actual approval_decisions.
   * Do not show stale approval_levels as pending.
   */
  if (
    expenseStatus === 'APPROVED' &&
    actualDecisionList.length > 0
  ) {
    actualDecisionList
      .map((decisionItem: any, index: number): TimelineItem => {
        const decisionStatus = String(
          decisionItem?.decision ||
            decisionItem?.status ||
            'APPROVED',
        )
          .trim()
          .toUpperCase();

        return {
          id: String(
            decisionItem?.id ||
              `decision-${decisionStatus}-${index}`,
          ),

          level: Number(
            decisionItem?.level ||
              decisionItem?.approvalLevel ||
              decisionItem?.approval_level ||
              index + 1,
          ),

          approverName: String(
            decisionItem?.approver_name ||
              decisionItem?.approverName ||
              decisionItem?.user_name ||
              decisionItem?.userName ||
              'Approver',
          ).trim(),

          approverRole: '',

          decision: decisionStatus,

          remarks: String(
            decisionItem?.comment ||
              decisionItem?.remarks ||
              '',
          ).trim(),

          createdAt: String(
            decisionItem?.created_at ||
              decisionItem?.createdAt ||
              '',
          ),

          isCreator: false,
          isMandatory: false,
          isDirector: false,
        };
      })
      .sort(
        (first, second) =>
          Number(first.level || 0) -
          Number(second.level || 0),
      )
      .forEach(item => {
        timeline.push(item);
      });

    return timeline;
  }

  const rejectedDecision = actualDecisionList.find(
    (decisionItem: any) => {
      const decisionStatus = String(
        decisionItem?.decision ||
          decisionItem?.status ||
          '',
      )
        .trim()
        .toUpperCase();

      return decisionStatus === 'REJECTED';
    },
  );

  const rejectedLevel = rejectedDecision
    ? Number(
        rejectedDecision?.level ||
          rejectedDecision?.approvalLevel ||
          rejectedDecision?.approval_level ||
          0,
      )
    : 0;

  /*
   * For PENDING / REJECTED flow, build from approval_levels.
   * If rejected, later levels become NOT_REQUIRED.
   */
  levelList.forEach((level: any, index: number) => {
    const approvalLevel = Number(
      level?.approvalLevel ||
        level?.approval_level ||
        level?.level ||
        index + 1,
    );

    const approverRoleId = Number(
      level?.approverRoleId ||
        level?.approver_role_id ||
        0,
    );

    const approverName = String(
      level?.approverName ||
        level?.approver_name ||
        level?.employee_name ||
        level?.role_name ||
        `Approver ${index + 1}`,
    ).trim();

    const isApproved =
      level?.approved === true ||
      level?.approved === 1 ||
      level?.approved === '1';

    const exactMatchingDecision = actualDecisionList.find(
      (decisionItem: any) => {
        const decisionLevel = Number(
          decisionItem?.level ||
            decisionItem?.approvalLevel ||
            decisionItem?.approval_level ||
            0,
        );

        const decisionApproverId = Number(
          decisionItem?.approver_id ||
            decisionItem?.approverId ||
            decisionItem?.approverRoleId ||
            decisionItem?.approver_role_id ||
            decisionItem?.user_id ||
            0,
        );

        return (
          decisionLevel === approvalLevel &&
          decisionApproverId === approverRoleId
        );
      },
    );

    /*
     * Fallback: sometimes approver_id and approverRoleId do not match.
     * In that case, match by level only for final decision display.
     */
    const levelMatchingDecision =
      exactMatchingDecision ||
      actualDecisionList.find((decisionItem: any) => {
        const decisionLevel = Number(
          decisionItem?.level ||
            decisionItem?.approvalLevel ||
            decisionItem?.approval_level ||
            0,
        );

        const decisionStatus = String(
          decisionItem?.decision ||
            decisionItem?.status ||
            '',
        )
          .trim()
          .toUpperCase();

        return (
          decisionLevel === approvalLevel &&
          ['APPROVED', 'REJECTED'].includes(
            decisionStatus,
          )
        );
      });

    const matchedDecisionStatus = String(
      levelMatchingDecision?.decision ||
        levelMatchingDecision?.status ||
        '',
    )
      .trim()
      .toUpperCase();

    let decision = 'PENDING';

    if (matchedDecisionStatus === 'REJECTED') {
      decision = 'REJECTED';
    } else if (
      expenseStatus === 'REJECTED' &&
      rejectedLevel > 0 &&
      approvalLevel > rejectedLevel
    ) {
      decision = 'NOT_REQUIRED';
    } else if (
      matchedDecisionStatus === 'APPROVED' ||
      isApproved
    ) {
      decision = 'APPROVED';
    } else {
      decision = 'PENDING';
    }

    timeline.push({
      id: String(
        level?.id ||
          `${approvalLevel}-${approverRoleId}`,
      ),

      level: approvalLevel,

      approverName:
        levelMatchingDecision?.approver_name ||
        levelMatchingDecision?.approverName ||
        approverName ||
        'Approver',

      approverRole:
        level?.isDirector === true ||
        level?.isDirector === 1 ||
        level?.isDirector === '1'
          ? 'Director'
          : '',

      decision,

      remarks: String(
        levelMatchingDecision?.comment ||
          levelMatchingDecision?.remarks ||
          level?.remarks ||
          '',
      ).trim(),

      createdAt: String(
        levelMatchingDecision?.created_at ||
          levelMatchingDecision?.createdAt ||
          level?.created_at ||
          level?.createdAt ||
          '',
      ),

      isCreator: false,

      isMandatory:
        level?.isMandatory === true ||
        level?.isMandatory === 1 ||
        level?.isMandatory === '1',

      isDirector:
        level?.isDirector === true ||
        level?.isDirector === 1 ||
        level?.isDirector === '1',
    });
  });

  return timeline;
}

function getStatusConfig(
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
        background: Colors.infoLight,
      };
    
    case 'NOT_REQUIRED':
  return {
    color: Colors.textMuted,
    background: Colors.surfaceSecondary,
  };

    default:
      return {
        color: Colors.primary,
        background:
          Colors.primaryLight,
      };
  }
}

function maskAccountNumber(
  accountNumber?: string,
) {
  if (!accountNumber) {
    return 'Not available';
  }

  const value = String(accountNumber);

  if (value.length <= 4) {
    return value;
  }

  return `•••• ${value.slice(-4)}`;
}

function formatCurrency(
  amount?: number | string,
) {
  return `₹${Number(
    amount || 0,
  ).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatFileSize(
  bytes?: number | null,
) {
  if (!bytes) {
    return 'Selected file';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

function formatDate(date?: string) {
  if (!date) {
    return 'Not available';
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  );
}

function formatDateTime(
  date?: string,
) {
  if (!date) {
    return 'Date not available';
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleString(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  );
}

/*
 * Keep your existing StyleSheet.create({...}) block below.
 */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
timelineCreatedDecision: {
  color: Colors.primary,
},
  content: {
    padding: 16,
    paddingBottom: 36,
  },

  pressed: {
    opacity: 0.82,
  },

  disabledButton: {
    opacity: 0.48,
  },

  emptyContainer: {
    flex: 1,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  emptyText: {
    marginTop: 7,
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },

  summaryCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },

  summaryContent: {
    flex: 1,
    marginLeft: 13,
  },

  voucherNo: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },

  categoryName: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textSecondary,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },

  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },

  amountRow: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },

  amountLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },

  amountValue: {
    marginTop: 5,
    fontSize: 25,
    fontWeight: '800',
    color: Colors.textPrimary,
  },

  paymentBadge: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
  },

  paymentText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },

  errorCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
  },

  errorText: {
    flex: 1,
    marginLeft: 8,
    color: Colors.danger,
    fontSize: 11,
    lineHeight: 16,
  },

  sectionCard: {
    marginTop: 16,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },

  sectionTitle: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 11,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  sectionBody: {
    paddingHorizontal: 16,
  },

  detailRow: {
    minHeight: 58,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    columnGap: 18,
  },

  detailDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  detailLabel: {
    flex: 1,
    fontSize: 11,
    color: Colors.textMuted,
  },

  detailValue: {
    flex: 1.3,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  timelineBody: {
    paddingHorizontal: 16,
    paddingBottom: 15,
  },

  timelineRow: {
    flexDirection: 'row',
  },

  timelineIndicator: {
    width: 32,
    alignItems: 'center',
  },

  timelineDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 56,
    backgroundColor: Colors.border,
  },

  timelineContent: {
    flex: 1,
    paddingLeft: 9,
    paddingBottom: 18,
  },

  timelineTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  timelineName: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },

  timelineDecision: {
    fontSize: 9,
    fontWeight: '800',
  },

  timelineLevel: {
    marginTop: 3,
    color: Colors.textMuted,
    fontSize: 9,
  },

  timelineRemarks: {
    marginTop: 7,
    color: Colors.textSecondary,
    fontSize: 10,
    lineHeight: 15,
  },

  timelineDate: {
    marginTop: 7,
    color: Colors.textMuted,
    fontSize: 9,
  },

  emptyTimeline: {
    paddingVertical: 24,
    alignItems: 'center',
  },

  emptyTimelineTitle: {
    marginTop: 9,
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },

  emptyTimelineText: {
    marginTop: 5,
    color: Colors.textMuted,
    fontSize: 10,
  },

  sendApprovalButton: {
    minHeight: 56,
    marginTop: 20,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 9,
    backgroundColor: Colors.primary,
  },

  sendApprovalButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '800',
  },

  decisionActions: {
    marginTop: 20,
    flexDirection: 'row',
    columnGap: 11,
  },

  rejectButton: {
    flex: 1,
    minHeight: 55,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: Colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    backgroundColor: Colors.dangerLight,
  },

  rejectButtonText: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '800',
  },

  approveButton: {
    flex: 1,
    minHeight: 55,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    backgroundColor: Colors.success,
  },

  approveButtonText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '800',
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
    backgroundColor: 'rgba(16,24,40,0.48)',
  },

  modalSheet: {
    maxHeight: '86%',
    paddingTop: 10,
    paddingHorizontal: 17,
    paddingBottom: 25,
    borderTopLeftRadius: 27,
    borderTopRightRadius: 27,
    backgroundColor: Colors.surface,
  },

  modalHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    backgroundColor: Colors.border,
  },

  modalHeader: {
    paddingTop: 17,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  modalTitleArea: {
    flex: 1,
  },

  modalTitle: {
    color: Colors.textPrimary,
    fontSize: 19,
    fontWeight: '800',
  },

  modalSubtitle: {
    marginTop: 4,
    color: Colors.textMuted,
    fontSize: 12,
  },

  modalClose: {
    width: 40,
    height: 40,
    marginLeft: 12,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceSecondary,
  },

  inputLabel: {
    marginBottom: 9,
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },

  reasonLoading: {
    minHeight: 90,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceSecondary,
  },

  reasonLoadingText: {
    marginTop: 8,
    color: Colors.textSecondary,
    fontSize: 10,
  },

  reasonError: {
    padding: 13,
    borderRadius: 14,
    backgroundColor: Colors.dangerLight,
    flexDirection: 'row',
    alignItems: 'center',
  },

  reasonErrorText: {
    flex: 1,
    color: Colors.danger,
    fontSize: 10,
  },

  reasonRetryText: {
    color: Colors.danger,
    fontSize: 10,
    fontWeight: '800',
  },

  reasonList: {
    rowGap: 8,
  },

  reasonItem: {
    minHeight: 48,
    paddingHorizontal: 13,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
  },

  reasonItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },

  radioOuter: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioOuterSelected: {
    borderColor: Colors.primary,
  },

  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },

  reasonText: {
    flex: 1,
    marginLeft: 10,
    color: Colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },

  reasonTextSelected: {
    color: Colors.primary,
  },

  remarksLabel: {
    marginTop: 18,
  },

  remarksInput: {
    minHeight: 115,
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSecondary,
    color: Colors.textPrimary,
    fontSize: 12,
    lineHeight: 18,
  },

  characterCount: {
    marginTop: 5,
    textAlign: 'right',
    color: Colors.textMuted,
    fontSize: 9,
  },

  modalErrorCard: {
    marginTop: 12,
    padding: 11,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
  },

  modalErrorText: {
    flex: 1,
    marginLeft: 7,
    color: Colors.danger,
    fontSize: 10,
    lineHeight: 15,
  },

  modalActions: {
    marginTop: 19,
    flexDirection: 'row',
    columnGap: 10,
  },

  cancelButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelButtonText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },

  confirmRejectButton: {
    flex: 1.35,
    minHeight: 50,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 7,
    backgroundColor: Colors.danger,
  },

  confirmRejectButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '800',
  },


  attachmentHeader: {
  paddingHorizontal: 16,
  paddingTop: 16,
  paddingBottom: 12,
  flexDirection: 'row',
  alignItems: 'center',
},

attachmentHeaderContent: {
  flex: 1,
},

attachmentDescription: {
  marginTop: 4,
  color: Colors.textMuted,
  fontSize: 10,
  lineHeight: 15,
},

uploadAttachmentButton: {
  minHeight: 38,
  marginLeft: 12,
  paddingHorizontal: 12,
  borderRadius: 12,
  flexDirection: 'row',
  alignItems: 'center',
  columnGap: 6,
  backgroundColor: Colors.primaryLight,
},

uploadAttachmentButtonText: {
  color: Colors.primary,
  fontSize: 10,
  fontWeight: '800',
},

attachmentBody: {
  paddingHorizontal: 16,
  paddingBottom: 15,
  rowGap: 9,
},

attachmentStatusRow: {
  minHeight: 52,
  padding: 10,
  borderRadius: 13,
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: Colors.surfaceSecondary,
},

attachmentStatusIcon: {
  width: 34,
  height: 34,
  borderRadius: 11,
  alignItems: 'center',
  justifyContent: 'center',
},

attachmentStatusIconSuccess: {
  backgroundColor: Colors.successLight,
},

attachmentStatusIconDanger: {
  backgroundColor: Colors.dangerLight,
},

attachmentStatusIconOptional: {
  backgroundColor: Colors.surface,
},

attachmentStatusContent: {
  flex: 1,
  marginLeft: 10,
},

attachmentStatusName: {
  color: Colors.textPrimary,
  fontSize: 11,
  fontWeight: '700',
},

attachmentStatusLabel: {
  marginTop: 3,
  color: Colors.textMuted,
  fontSize: 9,
},

noAttachmentConfig: {
  paddingVertical: 20,
  alignItems: 'center',
},

noAttachmentConfigText: {
  marginTop: 7,
  color: Colors.textMuted,
  fontSize: 10,
  textAlign: 'center',
},

attachmentModalSheet: {
  maxHeight: '88%',
  paddingTop: 10,
  paddingHorizontal: 17,
  paddingBottom: 25,
  borderTopLeftRadius: 27,
  borderTopRightRadius: 27,
  backgroundColor: Colors.surface,
},

attachmentPickerCard: {
  marginBottom: 11,
  padding: 13,
  borderRadius: 15,
  borderWidth: 1,
  borderColor: Colors.border,
  backgroundColor: Colors.surfaceSecondary,
},

attachmentPickerHeader: {
  flexDirection: 'row',
  alignItems: 'center',
},

attachmentPickerTitleArea: {
  flex: 1,
},

attachmentPickerTitle: {
  color: Colors.textPrimary,
  fontSize: 12,
  fontWeight: '700',
},

attachmentPickerRequirement: {
  marginTop: 3,
  color: Colors.textMuted,
  fontSize: 9,
},

uploadedBadge: {
  paddingHorizontal: 8,
  paddingVertical: 5,
  borderRadius: 9,
  flexDirection: 'row',
  alignItems: 'center',
  columnGap: 4,
  backgroundColor: Colors.successLight,
},

uploadedBadgeText: {
  color: Colors.success,
  fontSize: 8,
  fontWeight: '700',
},

chooseAttachmentButton: {
  minHeight: 44,
  marginTop: 11,
  borderRadius: 12,
  borderWidth: 1,
  borderStyle: 'dashed',
  borderColor: Colors.primary,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  columnGap: 7,
  backgroundColor: Colors.primaryLight,
},

chooseAttachmentButtonText: {
  color: Colors.primary,
  fontSize: 10,
  fontWeight: '700',
},

selectedAttachmentFile: {
  minHeight: 57,
  marginTop: 11,
  padding: 9,
  borderRadius: 12,
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: Colors.surface,
},

selectedAttachmentIcon: {
  width: 38,
  height: 38,
  borderRadius: 11,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: Colors.primaryLight,
},

selectedAttachmentContent: {
  flex: 1,
  marginLeft: 9,
},

selectedAttachmentName: {
  color: Colors.textPrimary,
  fontSize: 10,
  fontWeight: '700',
},

selectedAttachmentSize: {
  marginTop: 3,
  color: Colors.textMuted,
  fontSize: 8,
},

noAttachmentModal: {
  minHeight: 180,
  alignItems: 'center',
  justifyContent: 'center',
},

noAttachmentModalText: {
  marginTop: 9,
  color: Colors.textMuted,
  fontSize: 11,
},

uploadFilesButton: {
  flex: 1.35,
  minHeight: 50,
  borderRadius: 15,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  columnGap: 7,
  backgroundColor: Colors.primary,
},

uploadFilesButtonText: {
  color: Colors.white,
  fontSize: 12,
  fontWeight: '800',
  },

  timelineNameArea: {
  flex: 1,
},

timelineRole: {
  marginTop: 2,
  color: Colors.textMuted,
  fontSize: 8,
},

timelineMeta: {
  marginTop: 4,
  color: Colors.textMuted,
  fontSize: 8,
  fontWeight: '600',
  },

  infoCard: {
  marginTop: 14,
  padding: 12,
  borderRadius: 13,
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: Colors.infoLight,
},

infoCardText: {
  flex: 1,
  marginLeft: 8,
  color: Colors.info,
  fontSize: 11,
  lineHeight: 16,
  },

reasonTextContainer: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
},

otherReasonHint: {
  marginTop: 3,
  fontSize: 11,
  color: Colors.textMuted,
  },
attachmentClickableRow: {
  borderWidth: 1,
  borderColor: '#D8F3E4',
},

attachmentRowPressed: {
  opacity: 0.7,
  },


  messageIconButton: {
  width: 42,
  height: 42,
  marginRight: 8,
  borderRadius: 21,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: Colors.primaryLight,
  position: 'relative',
},

messageCountBadge: {
  position: 'absolute',
  top: -3,
  right: -3,
  minWidth: 18,
  height: 18,
  paddingHorizontal: 4,
  borderRadius: 9,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: Colors.danger,
},

messageCountText: {
  color: Colors.white,
  fontSize: 9,
  fontWeight: '800',
},

messageModalSheet: {
  maxHeight: '84%',
  backgroundColor: Colors.white,
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  paddingHorizontal: 20,
  paddingTop: 20,
},

messageLoading: {
  minHeight: 200,
  alignItems: 'center',
  justifyContent: 'center',
},

messageLoadingText: {
  marginTop: 10,
  color: Colors.textMuted,
  fontSize: 13,
},

messageErrorCard: {
  minHeight: 180,
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
},

messageErrorText: {
  marginTop: 8,
  color: Colors.danger,
  fontSize: 13,
  textAlign: 'center',
},

messageRetryText: {
  marginTop: 12,
  color: Colors.primary,
  fontSize: 13,
  fontWeight: '700',
},

emptyMessages: {
  minHeight: 220,
  alignItems: 'center',
  justifyContent: 'center',
},

emptyMessagesTitle: {
  marginTop: 12,
  color: Colors.textPrimary,
  fontSize: 16,
  fontWeight: '700',
},

emptyMessagesText: {
  marginTop: 5,
  color: Colors.textMuted,
  fontSize: 12,
  textAlign: 'center',
},

messageList: {
  paddingBottom: 20,
},

messageThread: {
  marginBottom: 14,
},

messageCard: {
  padding: 14,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: Colors.border,
  backgroundColor: Colors.surfaceSecondary,
},

messageCardHeader: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
},

messageSender: {
  color: Colors.textPrimary,
  fontSize: 13,
  fontWeight: '700',
},

messageRole: {
  marginTop: 2,
  color: Colors.textMuted,
  fontSize: 10,
},

messageBody: {
  marginTop: 10,
  color: Colors.textPrimary,
  fontSize: 13,
  lineHeight: 19,
},

messageDate: {
  marginTop: 8,
  color: Colors.textMuted,
  fontSize: 10,
},

messageStatusBadge: {
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 10,
},

messageResolvedBadge: {
  backgroundColor: Colors.successLight,
},

messageOpenBadge: {
  backgroundColor: Colors.warningLight,
},

messageStatusText: {
  fontSize: 9,
  fontWeight: '800',
},

replyCard: {
  marginTop: 8,
  marginLeft: 24,
  padding: 12,
  borderRadius: 12,
  backgroundColor: Colors.primaryLight,
},

replySender: {
  color: Colors.primary,
  fontSize: 12,
  fontWeight: '700',
  },
replyingToCard: {
  marginTop: 10,
  padding: 10,
  borderRadius: 12,
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor:
    Colors.primaryLight,
},

replyingToContent: {
  flex: 1,
  marginLeft: 8,
},

replyingToLabel: {
  color: Colors.textMuted,
  fontSize: 10,
},

replyingToName: {
  marginTop: 2,
  color: Colors.primary,
  fontSize: 12,
  fontWeight: '700',
},

noReplyQueryCard: {
  marginTop: 10,
  padding: 11,
  borderRadius: 12,
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor:
    Colors.infoLight,
},

noReplyQueryText: {
  flex: 1,
  marginLeft: 8,
  color: Colors.info,
  fontSize: 11,
  lineHeight: 16,
},

messageComposer: {
  marginTop: 12,
  paddingTop: 12,
  borderTopWidth: 1,
  borderTopColor: Colors.border,
  flexDirection: 'row',
  alignItems: 'flex-end',
  columnGap: 9,
},

messageInput: {
  flex: 1,
  minHeight: 48,
  maxHeight: 110,
  paddingHorizontal: 13,
  paddingVertical: 10,
  borderWidth: 1,
  borderColor: Colors.border,
  borderRadius: 14,
  backgroundColor:
    Colors.surfaceSecondary,
  color: Colors.textPrimary,
  fontSize: 13,
},

messageSendButton: {
  width: 48,
  height: 48,
  borderRadius: 14,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: Colors.primary,
  },

  messageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },

  messageHeaderContent: {
    flex: 1,
  },

  commentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },

  commentOpenStatus: {
    backgroundColor: Colors.warningLight,
  },

  commentResolvedStatus: {
    backgroundColor: Colors.successLight,
  },

  commentStatusText: {
    fontSize: 9,
    fontWeight: '800',
  },

  commentOpenStatusText: {
    color: Colors.warning,
  },

  commentResolvedStatusText: {
    color: Colors.success,
  },

  commentActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },

  commentReplyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
  },

  commentReplyButtonSelected: {
    borderWidth: 1,
    borderColor: Colors.primary,
  },

  commentReplyButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },

  commentResolveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: Colors.successLight,
  },

  commentResolveButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.success,
  },

  replyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  replyRole: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
  },

  receivedAttachmentList: {
    gap: 6,
    marginTop: 9,
  },

  receivedAttachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
  },

  receivedAttachmentName: {
    flex: 1,
    fontSize: 11,
    color: Colors.textPrimary,
  },

  messageAttachmentList: {
    gap: 7,
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  messageAttachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: Colors.primaryLight,
  },

  messageAttachmentName: {
    flex: 1,
    fontSize: 12,
    color: Colors.textPrimary,
  },

  messageAttachButton: {
    width: 47,
    height: 47,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },

  messageAttachmentCount: {
    position: 'absolute',
    top: 1,
    right: 1,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: Colors.danger,
  },

  messageAttachmentCountText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.white,
  },

  commentAttachmentList: {
  marginTop: 10,
  gap: 8,
},

commentAttachmentButton: {
  minHeight: 56,
  paddingHorizontal: 10,
  paddingVertical: 9,
  borderRadius: 11,
  borderWidth: 1,
  borderColor: Colors.border,
  backgroundColor:
    Colors.surfaceSecondary,
  flexDirection: 'row',
  alignItems: 'center',
},

commentAttachmentIcon: {
  width: 36,
  height: 36,
  borderRadius: 10,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor:
    Colors.primaryLight,
},

commentAttachmentContent: {
  flex: 1,
  marginHorizontal: 10,
},

commentAttachmentName: {
  fontSize: 12,
  lineHeight: 17,
  fontWeight: '700',
  color: Colors.textPrimary,
},

commentAttachmentAction: {
  marginTop: 3,
  fontSize: 10,
  lineHeight: 14,
  fontWeight: '600',
  color: Colors.primary,
},
});