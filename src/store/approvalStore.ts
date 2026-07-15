// src/store/approvalStore.ts

import { create } from 'zustand';

import { approvalApi } from '../api/approval.api';
import { expenseApi } from '../api/expense.api';

import {
    ApprovalActionResult,
    ApprovalApiResponse,
    ExpenseDecisionPayload,
    RejectionReason,
} from '../types/approval.types';

type ApprovalStore = {
    rejectionReasons: RejectionReason[];

    isLoadingRejectionReasons: boolean;
    isSendingForApproval: boolean;
    isSubmittingDecision: boolean;

    rejectionReasonError: string | null;
    approvalActionError: string | null;
    approvalActionMessage: string | null;

    loadRejectionReasons: (
        forceRefresh?: boolean,
    ) => Promise<void>;

    sendForApproval: (
        expenseId: number,
    ) => Promise<ApprovalActionResult>;

    approveExpense: (payload: {
        approvalRequestId: number;
        approverId: number;
        expenseCategoryId: number;
        remarks?: string;
    }) => Promise<ApprovalActionResult>;

    rejectExpense: (payload: {
        approvalRequestId: number;
        approverId: number;
        expenseCategoryId: number;
        remarks: string;
        rejectionReasonId?: number | string | null;
        rejectionReasonName?: string;
    }) => Promise<ApprovalActionResult>;

    clearApprovalMessages: () => void;

    resetApprovalStore: () => void;
};

const getApiErrorMessage = (
    error: unknown,
    fallbackMessage: string,
): string => {
    if (
        typeof error === 'object' &&
        error !== null
    ) {
        const axiosError = error as {
            response?: {
                data?: {
                    message?: string;
                    error?: string;
                };
            };
            message?: string;
        };

        return (
            axiosError.response?.data?.message ||
            axiosError.response?.data?.error ||
            axiosError.message ||
            fallbackMessage
        );
    }

    return fallbackMessage;
};

const isSuccessfulResponse = (
    response: ApprovalApiResponse,
): boolean => {
    return (
        response?.status === 1 ||
        response?.status === true ||
        response?.success === true
    );
};

const normalizeRejectionReasons = (
    response: ApprovalApiResponse<RejectionReason[]>,
): RejectionReason[] => {
    const responseData = response?.data;

    if (Array.isArray(responseData)) {
        return responseData;
    }

    const nestedResponse = responseData as unknown as {
        data?: RejectionReason[];
        rows?: RejectionReason[];
        result?: RejectionReason[];
    };

    if (Array.isArray(nestedResponse?.data)) {
        return nestedResponse.data;
    }

    if (Array.isArray(nestedResponse?.rows)) {
        return nestedResponse.rows;
    }

    if (Array.isArray(nestedResponse?.result)) {
        return nestedResponse.result;
    }

    return [];
};

const createDecisionPayload = (payload: {
    approvalRequestId: number;
    approverId: number;
    expenseCategoryId: number;
    decision: 'APPROVED' | 'REJECTED';
    remarks: string;
    meta?: Record<string, unknown>;
}): ExpenseDecisionPayload => {
    return {
        approvalRequestId:
            payload.approvalRequestId,

        approverId: payload.approverId,

        decision: payload.decision,

        remarks: payload.remarks,

        attachments: [],

        expense_category_id:
            payload.expenseCategoryId,

        meta: payload.meta ?? {},
    };
};

export const getRejectionReasonLabel = (
    reason?: RejectionReason | null,
): string => {
    return String(
        reason?.rejectionName || '',
    ).trim();
};

export const useApprovalStore =
    create<ApprovalStore>((set, get) => ({
        rejectionReasons: [],

        isLoadingRejectionReasons: false,
        isSendingForApproval: false,
        isSubmittingDecision: false,

        rejectionReasonError: null,
        approvalActionError: null,
        approvalActionMessage: null,

        loadRejectionReasons: async () => {
            set({
                isLoadingRejectionReasons: true,
                rejectionReasonError: '',
            });

            try {
                const response =
                    await expenseApi.getRejectionReasons();

                const rawReasons:
                    RejectionReason[] =
                    Array.isArray(response)
                        ? response
                        : Array.isArray(
                            response?.data,
                        )
                            ? response.data
                            : [];

                /*
                 * API contains duplicate names such as:
                 * "Technical Issue"
                 * "technical Issue"
                 *
                 * Keep only one reason for the same
                 * case-insensitive name.
                 */
                const uniqueReasons =
                    new Map<
                        string,
                        RejectionReason
                    >();

                rawReasons.forEach(reason => {
                    const rejectionName = String(
                        reason?.rejectionName || '',
                    ).trim();

                    const normalizedName =
                        rejectionName.toLowerCase();

                    const isActive =
                        reason?.status === true ||
                        reason?.status === 1 ||
                        reason?.status === '1';

                    const isDeleted =
                        reason?.delete_status ===
                        true ||
                        reason?.delete_status === 1 ||
                        reason?.delete_status ===
                        '1';

                    if (
                        !rejectionName ||
                        !isActive ||
                        isDeleted ||
                        uniqueReasons.has(
                            normalizedName,
                        )
                    ) {
                        return;
                    }

                    uniqueReasons.set(
                        normalizedName,
                        {
                            ...reason,
                            rejectionName,
                        },
                    );
                });

                const activeReasons =
                    Array.from(
                        uniqueReasons.values(),
                    ).sort((first, second) =>
                        first.rejectionName.localeCompare(
                            second.rejectionName,
                            undefined,
                            {
                                sensitivity: 'base',
                            },
                        ),
                    );

                set({
                    rejectionReasons:
                        activeReasons,

                    isLoadingRejectionReasons:
                        false,

                    rejectionReasonError: '',
                });
            } catch (error: any) {
                console.error(
                    'Unable to load rejection reasons:',
                    error,
                );

                set({
                    rejectionReasons: [],

                    isLoadingRejectionReasons:
                        false,

                    rejectionReasonError:
                        error?.response?.data
                            ?.message ||
                        error?.message ||
                        'Unable to load rejection reasons.',
                });
            }
        },

        sendForApproval: async expenseId => {
            if (!expenseId) {
                const message =
                    'Expense ID is required.';

                set({
                    approvalActionError: message,
                    approvalActionMessage: null,
                });

                return {
                    success: false,
                    message,
                };
            }

            set({
                isSendingForApproval: true,
                approvalActionError: null,
                approvalActionMessage: null,
            });

            try {
                const response =
                    await approvalApi.sendApprovalRequest({
                        id: expenseId,
                        status: 'PENDING',
                    });

                if (!isSuccessfulResponse(response)) {
                    throw new Error(
                        response?.message ||
                        'Unable to send the voucher for approval.',
                    );
                }

                const message =
                    response?.message ||
                    'Voucher sent for approval successfully.';

                set({
                    isSendingForApproval: false,
                    approvalActionError: null,
                    approvalActionMessage: message,
                });

                return {
                    success: true,
                    message,
                };
            } catch (error: unknown) {
                const message =
                    getApiErrorMessage(
                        error,
                        'Unable to send the voucher for approval.',
                    );

                set({
                    isSendingForApproval: false,
                    approvalActionError: message,
                    approvalActionMessage: null,
                });

                return {
                    success: false,
                    message,
                };
            }
        },

        approveExpense: async payload => {
            if (
                !payload.approvalRequestId ||
                !payload.approverId ||
                !payload.expenseCategoryId
            ) {
                const message =
                    'Approval request, approver and expense category are required.';

                set({
                    approvalActionError: message,
                    approvalActionMessage: null,
                });

                return {
                    success: false,
                    message,
                };
            }

            set({
                isSubmittingDecision: true,
                approvalActionError: null,
                approvalActionMessage: null,
            });

            try {
                const requestPayload =
                    createDecisionPayload({
                        approvalRequestId:
                            payload.approvalRequestId,

                        approverId:
                            payload.approverId,

                        expenseCategoryId:
                            payload.expenseCategoryId,

                        decision: 'APPROVED',

                        remarks:
                            payload.remarks?.trim() ||
                            'Approved',

                        meta: {},
                    });

                const response =
                    await approvalApi.approveOrRejectExpense(
                        requestPayload,
                    );

                if (!isSuccessfulResponse(response)) {
                    throw new Error(
                        response?.message ||
                        'Unable to approve the voucher.',
                    );
                }

                const message =
                    response?.message ||
                    'Voucher approved successfully.';

                set({
                    isSubmittingDecision: false,
                    approvalActionError: null,
                    approvalActionMessage: message,
                });

                return {
                    success: true,
                    message,
                };
            } catch (error: unknown) {
                const message =
                    getApiErrorMessage(
                        error,
                        'Unable to approve the voucher.',
                    );

                set({
                    isSubmittingDecision: false,
                    approvalActionError: message,
                    approvalActionMessage: null,
                });

                return {
                    success: false,
                    message,
                };
            }
        },

        rejectExpense: async payload => {
            const remarks =
                payload.remarks.trim();

            if (
                !payload.approvalRequestId ||
                !payload.approverId ||
                !payload.expenseCategoryId
            ) {
                const message =
                    'Approval request, approver and expense category are required.';

                set({
                    approvalActionError: message,
                    approvalActionMessage: null,
                });

                return {
                    success: false,
                    message,
                };
            }

            if (!remarks) {
                const message =
                    'Rejection remarks are required.';

                set({
                    approvalActionError: message,
                    approvalActionMessage: null,
                });

                return {
                    success: false,
                    message,
                };
            }

            set({
                isSubmittingDecision: true,
                approvalActionError: null,
                approvalActionMessage: null,
            });

            try {
                const requestPayload =
                    createDecisionPayload({
                        approvalRequestId:
                            payload.approvalRequestId,

                        approverId:
                            payload.approverId,

                        expenseCategoryId:
                            payload.expenseCategoryId,

                        decision: 'REJECTED',

                        remarks,

                        meta: {
                            rejectionReasonId:
                                payload.rejectionReasonId ??
                                null,

                            rejectionReasonName:
                                payload.rejectionReasonName ??
                                '',
                        },
                    });

                const response =
                    await approvalApi.approveOrRejectExpense(
                        requestPayload,
                    );

                if (!isSuccessfulResponse(response)) {
                    throw new Error(
                        response?.message ||
                        'Unable to reject the voucher.',
                    );
                }

                const message =
                    response?.message ||
                    'Voucher rejected successfully.';

                set({
                    isSubmittingDecision: false,
                    approvalActionError: null,
                    approvalActionMessage: message,
                });

                return {
                    success: true,
                    message,
                };
            } catch (error: unknown) {
                const message =
                    getApiErrorMessage(
                        error,
                        'Unable to reject the voucher.',
                    );

                set({
                    isSubmittingDecision: false,
                    approvalActionError: message,
                    approvalActionMessage: null,
                });

                return {
                    success: false,
                    message,
                };
            }
        },

        clearApprovalMessages: () => {
            set({
                approvalActionError: null,
                approvalActionMessage: null,
            });
        },

        resetApprovalStore: () => {
            set({
                rejectionReasons: [],

                isLoadingRejectionReasons: false,
                isSendingForApproval: false,
                isSubmittingDecision: false,

                rejectionReasonError: null,
                approvalActionError: null,
                approvalActionMessage: null,
            });
        },
    }));