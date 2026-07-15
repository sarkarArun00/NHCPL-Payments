// src/store/createVoucherStore.ts

import { create } from 'zustand';

import { expenseApi } from '../api/expense.api';
import { excelVoucherService } from '../services/excelVoucher.service';

import {
    BulkExpensePayloadItem,
    BulkExpenseResponse,
    ExcelVoucherCategoryType,
    ExcelVoucherFile,
    ExcelVoucherRow,
} from '../types/excelVoucher.types';

type SelectCategoryPayload = {
    id: number;
    name: string;
};

type SubmitVoucherPayload = {
    userId: number;
    centerId: number;
    expenseDate?: string;
};

type CreateVoucherStore = {
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

    selectCategory: (category: SelectCategoryPayload) => void;

    clearCategory: () => void;

    processExcelFile: (
        file: ExcelVoucherFile,
    ) => Promise<boolean>;

    removeSelectedFile: () => void;

    submitBulkVoucher: (
        payload: SubmitVoucherPayload,
    ) => Promise<boolean>;

    clearUploadResponse: () => void;

    resetCreateVoucher: () => void;
};

const getCategoryType = (
    categoryName: string,
): ExcelVoucherCategoryType => {
    const normalizedName = categoryName
        .trim()
        .toUpperCase();

    return normalizedName === 'SALARY'
        ? 'SALARY'
        : 'NON_SALARY';
};

const getCurrentDate = (): string => {
    const date = new Date();

    const year = date.getFullYear();

    const month = String(
        date.getMonth() + 1,
    ).padStart(2, '0');

    const day = String(
        date.getDate(),
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

const getResponseMessage = (
    error: any,
    fallback: string,
): string => {
    return (
        error?.response?.data?.message ||
        error?.message ||
        fallback
    );
};

const isSuccessfulResponse = (
    response: BulkExpenseResponse,
): boolean => {
    return (
        response?.status === 1 ||
        response?.status === true ||
        response?.success === true
    );
};

export const useCreateVoucherStore =
    create<CreateVoucherStore>((set, get) => ({
        selectedCategoryId: null,
        selectedCategoryName: '',
        categoryType: 'NON_SALARY',

        selectedFile: null,

        previewRows: [],
        validRows: [],
        invalidRows: [],

        missingHeaders: [],

        isReadingFile: false,
        isSubmitting: false,

        fileError: null,
        submitError: null,

        uploadResponse: null,

        selectCategory: category => {
            const categoryType = getCategoryType(
                category.name,
            );

            set({
                selectedCategoryId: category.id,
                selectedCategoryName: category.name,
                categoryType,

                selectedFile: null,

                previewRows: [],
                validRows: [],
                invalidRows: [],

                missingHeaders: [],

                fileError: null,
                submitError: null,

                uploadResponse: null,
            });
        },

        clearCategory: () => {
            set({
                selectedCategoryId: null,
                selectedCategoryName: '',
                categoryType: 'NON_SALARY',

                selectedFile: null,

                previewRows: [],
                validRows: [],
                invalidRows: [],

                missingHeaders: [],

                fileError: null,
                submitError: null,

                uploadResponse: null,
            });
        },

        processExcelFile: async file => {
            const {
                selectedCategoryId,
                categoryType,
            } = get();

            if (!selectedCategoryId) {
                set({
                    fileError:
                        'Please select an expense category before choosing an Excel file.',
                });

                return false;
            }

            const fileName = file.name.toLowerCase();

            const isSupportedFile =
                fileName.endsWith('.xlsx') ||
                fileName.endsWith('.xls');

            if (!isSupportedFile) {
                set({
                    fileError:
                        'Please select a valid XLS or XLSX file.',
                });

                return false;
            }

            set({
                selectedFile: file,

                isReadingFile: true,

                fileError: null,
                submitError: null,

                previewRows: [],
                validRows: [],
                invalidRows: [],

                missingHeaders: [],

                uploadResponse: null,
            });

            try {
                const validationResult =
                    await excelVoucherService.readAndValidateFile(
                        file.uri,
                        categoryType,
                    );

                if (
                    validationResult.missingHeaders.length > 0
                ) {
                    set({
                        selectedFile: file,

                        previewRows: [],
                        validRows: [],
                        invalidRows: [],

                        missingHeaders:
                            validationResult.missingHeaders,

                        isReadingFile: false,

                        fileError:
                            `Missing required column${validationResult.missingHeaders
                                .length > 1
                                ? 's'
                                : ''
                            }: ${validationResult.missingHeaders.join(
                                ', ',
                            )}`,
                    });

                    return false;
                }

                set({
                    selectedFile: file,

                    previewRows:
                        validationResult.rows,

                    validRows:
                        validationResult.validRows,

                    invalidRows:
                        validationResult.invalidRows,

                    missingHeaders: [],

                    isReadingFile: false,

                    fileError: null,
                });

                return true;
            } catch (error: any) {
                set({
                    selectedFile: null,

                    previewRows: [],
                    validRows: [],
                    invalidRows: [],

                    missingHeaders: [],

                    isReadingFile: false,

                    fileError: getResponseMessage(
                        error,
                        'Unable to read the selected Excel file.',
                    ),
                });

                return false;
            }
        },

        removeSelectedFile: () => {
            set({
                selectedFile: null,

                previewRows: [],
                validRows: [],
                invalidRows: [],

                missingHeaders: [],

                isReadingFile: false,

                fileError: null,
                submitError: null,

                uploadResponse: null,
            });
        },

        submitBulkVoucher: async payload => {
            const {
                selectedCategoryId,
                validRows,
                invalidRows,
            } = get();

            if (!selectedCategoryId) {
                set({
                    submitError:
                        'Please select an expense category.',
                });

                return false;
            }

            if (invalidRows.length > 0) {
                set({
                    submitError:
                        'Please correct all invalid Excel rows before submitting.',
                });

                return false;
            }

            if (validRows.length === 0) {
                set({
                    submitError:
                        'There are no valid voucher rows to submit.',
                });

                return false;
            }

            const expenseDate =
                payload.expenseDate ||
                getCurrentDate();

            const bulkPayload: BulkExpensePayloadItem[] =
                validRows.map(row => ({
                    user_id: payload.userId,

                    center_id: payload.centerId,

                    expense_date: expenseDate,

                    category_id:
                        selectedCategoryId,

                    sub_expense_id: null,

                    beneficiary_code:
                        row.beneficiaryCode,

                    beneficiary_name:
                        row.beneficiaryName,

                    expense_type: 1,

                    gross_amount: row.amount,

                    net_payable: row.amount,

                    remarks: row.narration,

                    payment_type: 3,

                    payment_mode: 'BANK',

                    transaction_ref: '',

                    status: 'CREATED',
                }));

            set({
                isSubmitting: true,
                submitError: null,
                uploadResponse: null,
            });

            try {
                console.log(
                    'BULK VOUCHER PAYLOAD:',
                    JSON.stringify(
                        bulkPayload,
                        null,
                        2,
                    ),
                );

                const response =
                    (await expenseApi.createBulkExpense(
                        bulkPayload,
                    )) as BulkExpenseResponse;

                console.log(
                    'BULK VOUCHER RESPONSE:',
                    JSON.stringify(
                        response,
                        null,
                        2,
                    ),
                );

                if (!isSuccessfulResponse(response)) {
                    throw new Error(
                        response?.message ||
                        'Unable to create payment vouchers.',
                    );
                }

                set({
                    isSubmitting: false,
                    submitError: null,
                    uploadResponse: response,
                });

                return true;
            } catch (error: any) {
                set({
                    isSubmitting: false,

                    submitError: getResponseMessage(
                        error,
                        'Unable to create payment vouchers.',
                    ),

                    uploadResponse: null,
                });

                return false;
            }
        },

        clearUploadResponse: () => {
            set({
                uploadResponse: null,
                submitError: null,
            });
        },

        resetCreateVoucher: () => {
            set({
                selectedCategoryId: null,
                selectedCategoryName: '',
                categoryType: 'NON_SALARY',

                selectedFile: null,

                previewRows: [],
                validRows: [],
                invalidRows: [],

                missingHeaders: [],

                isReadingFile: false,
                isSubmitting: false,

                fileError: null,
                submitError: null,

                uploadResponse: null,
            });
        },
    }));