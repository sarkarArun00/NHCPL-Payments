// src/types/approval.types.ts

export type ApprovalDecisionType =
    | 'APPROVED'
    | 'REJECTED';

export type SendApprovalRequestPayload = {
    id: number;
    status: 'PENDING';
};

export type ExpenseDecisionPayload = {
    approvalRequestId: number;
    approverId: number;

    decision: ApprovalDecisionType;

    remarks: string;

    attachments: unknown[];

    expense_category_id: number;

    meta: Record<string, unknown>;
};

export type BulkSendApprovalPayload = {
    ids: number[];
    status: 'PENDING';
};

export type BulkExpenseDecisionItem = {
    approvalRequestId: number;
    expense_category_id: number;
};

export type BulkExpenseDecisionPayload = {
    approvalRequestIds?: number[];

    expenses?: BulkExpenseDecisionItem[];

    approverId: number;

    decision: ApprovalDecisionType;

    remarks: string;

    attachments?: unknown[];

    meta?: Record<string, unknown>;
};

export type RejectionReason = {
    id: number;
    rejectionName: string;
    description?: string;
    status: boolean | number | string;
    createdAt?: string;
    updatedAt?: string;
    delete_status?: boolean | number | string;
};

export type ApprovalApiResponse<T = unknown> = {
    status: number | boolean;
    success?: boolean;
    message?: string;
    data?: T;
};

export type ApprovalActionResult = {
    success: boolean;
    message: string;
};

export type ApprovalTimelineItem = {
    level: number;

    approverId: number;
    approverName: string;

    decision: ApprovalDecisionType | string;

    comment: string;

    createdAt: string;
};

export type ApprovalLevelItem = {
    approvalLevel: number;

    approverRoleId: number;
    approverName: string;

    isMandatory: boolean;
    isDirector: boolean;
    approved: boolean;
};