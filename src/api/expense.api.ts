import { RejectionReasonApiResponse } from '../types/rejectionReason.types';
import { apiClient } from './apiClient';
import type {
    ExpenseComment,
    GetExpenseCommentsResponse,
    ResolveExpenseCommentPayload,
    ResolveExpenseCommentResponse,
    SendExpenseCommentResponse,
} from '../types/expenseComment.types';

export type ExpenseSummaryPayload = {
    payment_mode?: string;
    status?: string;
    user_id: number;
    center_id?: number;
    category_id?: number;
    fromDate?: string;
    toDate?: string;
};

export type ExpenseDetailsApiResponse = {
    status: number;
    message: string;
    data: any;
};

import type {
    ExpenseStatus,
} from '../types/voucher.types';

export type ExpenseCategoryCountRequest = {
    payment_mode: 'BANK';
    center_id: number;
    status: ExpenseStatus;
    type: string;
    fromDate: string,
    toDate: string
};

export type ExpenseCategoryCount = {
    category_id: number;
    category_name: string;
    expense_count: number;
};


export type ExpenseCategoryCountApiResponse = {
    status?: number;
    success?: boolean;
    message?: string;
    data?: ExpenseCategoryCount[];
};

export type BulkExpenseDecisionPayload = {
    approvalRequestIds: number[];
    approverId: number;
    decision: 'APPROVED' | 'REJECTED';
    expense_category_id: number;
    remarks: boolean;
};

export type BulkExpenseDecisionResponse = {
    status: number;
    message: string;
    data?: any;
};

export type BulkSendExpenseApprovalPayload = {
    ids: number[];
    status: 'PENDING';
};

export type BulkSendExpenseApprovalResponse = {
    status?: number;
    success?: boolean;
    message?: string;
    data?: unknown;
};


export type PaymentChecklistPayload = {
    center_id: number;
    expense_category_id?: number;
    status?: string;
    fromDate?: string;
    toDate?: string;
};

export type PaymentChecklistItem = {
    checklist_id: number;
    status: string;

    approved_on: string | null;
    scheduled_on: string | null;
    executed_on: string | null;

    checklist_center_id: number | null;
    expense_center_id: number | null;

    expense_id: number;
    amount: number | string;

    category_id: number | null;
    category_name: string | null;

    beneficiary_name: string | null;
    bank_name: string | null;
    account_number: string | null;
    ifsc_code: string | null;

    voucher_no: string | null;
    voucher_created_on: string | null;
};

export type PaymentChecklistSummary = {
    totalPayments: number;
    pendingPayments: number;
    failedPayments: number;
    totalAmount: number;
};

export type PaymentChecklistResponse = {
    status: number;
    success?: boolean;
    message?: string;

    records?: {
        summary?: PaymentChecklistSummary;
        data?: PaymentChecklistItem[];
    };
};

export type PayNowResponse = {
    status: number;
    success?: boolean;
    message?: string;
    data?: any;
};

export type ExpenseCategoryByCenter = {
    id: number;
    category_code?: string | null;
    category_name: string;
    description?: string | null;
    status?: boolean;
    is_deleted?: boolean | null;
};

export const expenseApi = {
    createBulkExpense: async (data: unknown) => {
        const response = await apiClient.post(
            'accounts/expense/bulk-create',
            data,
        );

        return response.data;
    },

    getAllExpense: async (data: Record<string, unknown>) => {
        const response = await apiClient.post(
            'accounts/expense/getAll',
            data,
        );

        return response.data;
    },

    getAllSummary: async (data: ExpenseSummaryPayload) => {
        const response = await apiClient.post(
            'accounts/expense/summary',
            data,
        );

        return response.data;
    },

    getAllExpenseCategory: async () => {
        const response = await apiClient.get(
            'accounts/master/expense-category/getAll',
        );

        return response.data;
    },



    getExpenseCategoryCount: async (
        payload: ExpenseCategoryCountRequest,
    ): Promise<ExpenseCategoryCount[]> => {
        const response =
            await apiClient.post<
                | ExpenseCategoryCount[]
                | ExpenseCategoryCountApiResponse
            >(
                '/accounts/expense/expense-category-count',
                payload,
            );

        const responseBody = response.data;

        /*
         * Supports both response formats:
         *
         * 1. [...]
         * 2. { status, message, data: [...] }
         */
        if (Array.isArray(responseBody)) {
            return responseBody;
        }

        if (Array.isArray(responseBody?.data)) {
            return responseBody.data;
        }

        return [];
    },

    getAllExpenseCategoryByCentre: async (
        centerId: number,
    ) => {
        const response = await apiClient.get(
            'accounts/master/expense-category/getAll',
            {
                params: {
                    centerId,
                },
            },
        );

        return response.data;
    },

    getRejectionReasons:
        async (): Promise<RejectionReasonApiResponse> => {
            const response =
                await apiClient.get<RejectionReasonApiResponse>(
                    'accounts/master/rejection/getAllRejectionType',
                );

            return response.data;
        },
    
    getExpenseDetails: async (
        expenseId: number,
    ): Promise<any> => {
        const response =
            await apiClient.get<ExpenseDetailsApiResponse>(
                `accounts/expense/getExpenseDetails/${expenseId}`,
            );

        if (
            Number(response.data?.status) !== 1 ||
            !response.data?.data
        ) {
            throw new Error(
                response.data?.message ||
                'Unable to load expense details.',
            );
        }

        return response.data.data;
    },

    bulkExpenseDecision: async (
        payload: BulkExpenseDecisionPayload,
    ): Promise<BulkExpenseDecisionResponse> => {
        const response =
            await apiClient.post<BulkExpenseDecisionResponse>(
                'approval/bulk-expense-decision',
                payload,
            );

        return response.data;
    },

    bulkSendExpenseForApproval: async (
        payload: BulkSendExpenseApprovalPayload,
    ): Promise<BulkSendExpenseApprovalResponse> => {
        const response =
            await apiClient.post<BulkSendExpenseApprovalResponse>(
                'accounts/expense/bulk-sent-expense-approval',
                payload,
            );

        return response.data;
    },
    getExpenseComments: async (
        expenseId: number,
    ): Promise<ExpenseComment[]> => {
        const response =
            await apiClient.get<GetExpenseCommentsResponse>(
                `accounts/expense/comment/${expenseId}`,
            );

        const result = response.data;

        const isSuccess =
            Number(result?.status) === 1 ||
            result?.success === true;

        if (!isSuccess) {
            throw new Error(
                result?.message ||
                'Unable to load expense comments.',
            );
        }

        const commentList =
            Array.isArray(result?.data)
                ? result.data
                : [];

        return commentList.map(
            (
                comment: ExpenseComment,
            ): ExpenseComment => ({
                ...comment,

                attachments: Array.isArray(
                    comment?.attachments,
                )
                    ? comment.attachments
                    : [],

                replies: Array.isArray(
                    comment?.replies,
                )
                    ? comment.replies.map(
                        (
                            reply: ExpenseComment,
                        ): ExpenseComment => ({
                            ...reply,

                            attachments:
                                Array.isArray(
                                    reply?.attachments,
                                )
                                    ? reply.attachments
                                    : [],

                            replies: Array.isArray(
                                reply?.replies,
                            )
                                ? reply.replies
                                : [],
                        }),
                    )
                    : [],
            }),
        );
    },
    sendExpenseComment: async (
        formData: FormData,
    ): Promise<SendExpenseCommentResponse> => {
        const response =
            await apiClient.post<SendExpenseCommentResponse>(
                'accounts/expense/queryCreate',
                formData,
                {
                    headers: {
                        'Content-Type':
                            'multipart/form-data',
                    },
                    transformRequest: data => data,
                },
            );

        return response.data;
    },
    replyExpenseComment: async (
        formData: FormData,
    ): Promise<SendExpenseCommentResponse> => {
        const response =
            await apiClient.post<SendExpenseCommentResponse>(
                'accounts/expense/reply',
                formData,
            );

        return response.data;
    },

    resolveExpenseComment: async (
        payload: {
            id: number;
            resolved: boolean;
        },
    ) => {
        const response =
            await apiClient.post(
                'accounts/expense/comment/resolve',
                payload,
            );

        return response.data;
    },
    paymentChecklist: async (
        payload: PaymentChecklistPayload,
    ): Promise<PaymentChecklistResponse> => {
        const response =
            await apiClient.post<PaymentChecklistResponse>(
                'accounts/expense/payment-checklist',
                payload,
            );

        return response.data;
    },

    payNowExpense: async (
        checklistId: number,
    ): Promise<PayNowResponse> => {
        const response =
            await apiClient.get<PayNowResponse>(
                `accounts/expense/paynow/${checklistId}`,
            );

        return response.data;
    },

    getExpenseCategoriesByCenter: async (
        centerId: number,
    ): Promise<ExpenseCategoryByCenter[]> => {
        const response = await apiClient.get(
            'accounts/master/expense-category/getAll',
            {
                params: {
                    centerId,
                },
            },
        );

        /*
         * Supports all of these responses:
         *
         * [...]
         *
         * { data: [...] }
         *
         * Single category object
         */
        const rawData =
            response?.data?.data ??
            response?.data;

        const categoryList =
            Array.isArray(rawData)
                ? rawData
                : rawData &&
                    typeof rawData === 'object'
                    ? [rawData]
                    : [];

        return categoryList
            .filter(
                (item: any) =>
                    Number(item?.id ?? 0) > 0 &&
                    item?.status !== false &&
                    item?.is_deleted !== true,
            )
            .map(
                (
                    item: any,
                ): ExpenseCategoryByCenter => ({
                    id: Number(item.id),

                    category_code:
                        item?.category_code ?? null,

                    category_name: String(
                        item?.category_name ?? '',
                    ).trim(),

                    description:
                        item?.description ?? null,

                    status:
                        item?.status !== false,

                    is_deleted:
                        item?.is_deleted ?? null,
                }),
            )
            .filter(item =>
                Boolean(item.category_name),
            );
    },
};