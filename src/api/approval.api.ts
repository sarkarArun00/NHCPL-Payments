// src/api/approval.api.ts

import { apiClient } from './apiClient';

import {
    ApprovalApiResponse,
    BulkExpenseDecisionPayload,
    BulkSendApprovalPayload,
    ExpenseDecisionPayload,
    RejectionReason,
    SendApprovalRequestPayload,
} from '../types/approval.types';

export const approvalApi = {
    /**
     * Send a single expense voucher for approval.
     */
    sendApprovalRequest: async (
        payload: SendApprovalRequestPayload,
    ): Promise<ApprovalApiResponse> => {
        const response =
            await apiClient.post<ApprovalApiResponse>(
                'accounts/expense/sent-expense-approval',
                payload,
            );

        return response.data;
    },

    /**
     * Approve or reject a single expense voucher.
     */
    approveOrRejectExpense: async (
        payload: ExpenseDecisionPayload,
    ): Promise<ApprovalApiResponse> => {
        const response =
            await apiClient.post<ApprovalApiResponse>(
                'approval/approveOrRejetcExpense',
                payload,
            );

        return response.data;
    },

    /**
     * Send multiple expense vouchers for approval.
     */
    bulkSendExpenseApproval: async (
        payload: BulkSendApprovalPayload,
    ): Promise<ApprovalApiResponse> => {
        const response =
            await apiClient.post<ApprovalApiResponse>(
                'accounts/expense/bulk-sent-expense-approval',
                payload,
            );

        return response.data;
    },

    /**
     * Approve or reject multiple expense vouchers.
     */
    bulkExpenseDecision: async (
        payload: BulkExpenseDecisionPayload,
    ): Promise<ApprovalApiResponse> => {
        const response =
            await apiClient.post<ApprovalApiResponse>(
                'approval/bulk-expense-decision',
                payload,
            );

        return response.data;
    },

    /**
     * Directly update an expense status.
     */
    updateExpenseStatus: async (
        payload: {
            id: number;
            status: string;
        },
    ): Promise<ApprovalApiResponse> => {
        const response =
            await apiClient.post<ApprovalApiResponse>(
                'accounts/expense/update-status',
                payload,
            );

        return response.data;
    },

    /**
     * Get rejection reasons for the Accounts module.
     */
    getAllRejectionTypes: async (): Promise<
        ApprovalApiResponse<RejectionReason[]>
    > => {
        const response = await apiClient.get<
            ApprovalApiResponse<RejectionReason[]>
        >(
            'accounts/master/rejection/getAllRejectionType',
        );

        return response.data;
    },
};