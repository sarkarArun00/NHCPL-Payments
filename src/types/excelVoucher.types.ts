// src/types/excelVoucher.types.ts

export type ExcelVoucherCategoryType =
    | 'SALARY'
    | 'NON_SALARY';

export type ExcelVoucherFile = {
    uri: string;
    name: string;
    type?: string | null;
    size?: number | null;
};

export type ExcelVoucherRawRow = {
    [columnName: string]: unknown;
};

export type ExcelVoucherRow = {
    rowNumber: number;

    beneficiaryName: string;
    beneficiaryCode: string | null;

    amount: number;
    narration: string;

    isValid: boolean;
    errors: string[];

    raw: ExcelVoucherRawRow;
};

export type ExcelVoucherValidationResult = {
    rows: ExcelVoucherRow[];

    validRows: ExcelVoucherRow[];
    invalidRows: ExcelVoucherRow[];

    totalRows: number;
    validCount: number;
    invalidCount: number;

    headers: string[];
    missingHeaders: string[];
};

export type BulkExpensePayloadItem = {
    user_id: number;
    center_id: number;

    expense_date: string;
    category_id: number;
    sub_expense_id: number | null;

    beneficiary_code: string | null;
    beneficiary_name: string;

    expense_type: number;

    gross_amount: number;
    net_payable: number;

    remarks: string;

    payment_type: number;
    payment_mode: 'BANK';

    transaction_ref: string;

    status: 'CREATED';
};

export type BulkExpenseSuccessItem = {
    row?: number;
    id?: number;
    beneficiary_name?: string;
    message?: string;
};

export type BulkExpenseFailedItem = {
    row?: number;
    beneficiary_name?: string;
    beneficiary_code?: string | null;
    message?: string;
    errors?: string[];
};

export type BulkExpenseResponse = {
    status: number | boolean;
    success?: boolean;
    message?: string;

    total?: number;
    successCount?: number;
    failedCount?: number;

    successful?: BulkExpenseSuccessItem[];
    failed?: BulkExpenseFailedItem[];

    data?: {
        total?: number;
        successCount?: number;
        failedCount?: number;

        successful?: BulkExpenseSuccessItem[];
        failed?: BulkExpenseFailedItem[];
    };
};

export type CreateVoucherState = {
    selectedCategoryId: number | null;
    selectedCategoryName: string;

    categoryType: ExcelVoucherCategoryType;

    selectedFile: ExcelVoucherFile | null;

    previewRows: ExcelVoucherRow[];
    validRows: ExcelVoucherRow[];
    invalidRows: ExcelVoucherRow[];

    missingHeaders: string[];

    isReadingFile: boolean;
    isSubmitting: boolean;

    fileError: string | null;
    submitError: string | null;

    uploadResponse: BulkExpenseResponse | null;
};