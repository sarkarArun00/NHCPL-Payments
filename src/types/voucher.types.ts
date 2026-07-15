// src/types/voucher.types.ts

export type ExpenseStatus =
    | 'CREATED'
    | 'PENDING'
    | 'APPROVED'
    | 'REJECTED'
    | 'SETTLED'
    | string;

export type ExpenseCategoryAttachment = {
    id: string;
    expenseCategoryId: number;
    attachmentType: string;
    isMandatory: boolean;
    createdAt: string;
};

export type ExpenseCategory = {
    id: number;
    category_name: string;
    categories_attachment: ExpenseCategoryAttachment[];
};

export type ExpenseCategoryOption = {
    id: number;
    category_name: string;
    count?: number;
    categories_attachment?: ExpenseCategoryAttachment[];
};

export type ExpenseVendor = {
    vendorId: number;
    vendorName: string;
};

export type ExpenseBankDetail = {
    id: number;
    expense_payment_id: number;
    bank_id: number;
    bank_name: string;
    account_number: string;
    ifsc_code: string;
    amount: string;
    transaction_ref: string;
    beneficiary_name: string;
    created_at: string;
    updated_at: string;
};

export type ExpenseVoucherInfo = {
    id: number;
    voucher_no: string;
    voucher_type: string;
};

export type ExpensePayment = {
    id: number;
    payment_type: number;
    amount: string;
    cheques: unknown[];
    denominations: unknown[];
    voucher: ExpenseVoucherInfo | null;
    expenseBankDetails: ExpenseBankDetail[];
};

export type ExpenseAttachment = {
    id: number;
    expense_id: number;
    attachment_type: string;
    file_path: string;
    created_at: string;
};

export type ApprovalDecision = {
    level: number;
    approver_id: number;
    approver_name: string;
    decision: string;
    comment: string;
    created_at: string;
};

export type ApprovalLevel = {
    approvalLevel: number;
    approverRoleId: number;
    approverName: string;
    isMandatory: boolean;
    isDirector: boolean;
    approved: boolean;
};

export type ApprovalRequest = {
    id: string;
    status: string;
    currentLevel: number;
    approvalMode: string;
    createdAt: string;
};

export type ExpenseApiItem = {
    id: number;
    user_id: number;
    expense_date: string;
    category_id: number;

    category: ExpenseCategory | null;
    sub_category: unknown | null;

    vendor: ExpenseVendor | null;
    vendor_name: string | null;

    expense_type: number;
    payment_mode: string;

    gross_amount: string;
    discount_amount: string;
    tds_amount: string;
    net_payable: string;

    remarks: string;
    status: ExpenseStatus;

    estimated_cost: string;
    advance_amount: string;

    approved_by: number | null;
    approved_by_name: string | null;
    approved_at: string | null;

    created_at: string;

    payments: ExpensePayment[];
    attachments: ExpenseAttachment[];

    approval_decisions: ApprovalDecision[];
    approval_levels: ApprovalLevel[];
    approvalRequest: ApprovalRequest | null;

    total_comments_count: number;
    raised_query_count: number;
    solved_query_count: number;
};

export type ExpenseVoucher = {
    id: number;

    voucherNo: string;
    categoryName: string;

    beneficiaryName: string;
    beneficiaryCode: string | null;
    vendorName: string;

    expenseDate: string;
    createdAt: string;

    grossAmount: number;
    netPayable: number;

    paymentMode: string;
    status: ExpenseStatus;
    remarks: string;

    bankName: string;
    accountNumber: string;
    transactionReference: string;

    commentsCount: number;
    raisedQueryCount: number;
    solvedQueryCount: number;

    currentApprovalLevel: number | null;
    approvalMode: string | null;

    attachmentCount: number;

    raw: ExpenseApiItem;
};

export type ExpenseListPayload = {
    user_id?: number;
    center_id: number;

    category_id?: number | null;
    status?: ExpenseStatus;

    payment_mode?: string;

    fromDate?: string;
    toDate?: string;

    search?: string;

    page?: number;
    limit?: number;
};