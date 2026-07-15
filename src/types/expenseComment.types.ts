export type ExpenseCommentType =
    | 'COMMENT'
    | 'REPLY';

export type CommentAttachment = {
    id?: number;
    file_url?: string;
    file_name?: string;
    name?: string;
    url?: string;
    path?: string;
    mime_type?: string;
    size?: number;
};

export type ExpenseComment = {
    id: number;

    expense_id: number;

    voucher_id?: number | null;

    approval_request_id?:
    | number
    | null;

    user_id: number;

    parent_id?: number | null;

    comment_type:
    ExpenseCommentType;

    message: string;

    is_resolved: boolean;

    is_deleted?: boolean;

    created_at: string;

    updated_at?: string;

    attachments:
    CommentAttachment[];

    employee_name?: string;

    employeePhoto?: string | null;

    user_type?: string;

    replies: ExpenseComment[];
};

export type GetExpenseCommentsResponse = {
    status: number;
    success?: boolean;
    message?: string;
    data?: ExpenseComment[];
};

export type SendExpenseCommentResponse = {
    status: number;
    success?: boolean;
    message?: string;
    data?: ExpenseComment;
};

export type ResolveExpenseCommentPayload = {
    id: number;
    resolved: boolean;
};

export type ResolveExpenseCommentResponse = {
    status: number;
    success?: boolean;
    message?: string;
    data?: unknown;
};