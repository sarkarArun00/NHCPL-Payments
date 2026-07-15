import { create } from 'zustand';

import { expenseApi } from '../api/expense.api';
import {
    ExpenseApiItem,
    ExpenseCategoryOption,
    ExpenseListPayload,
    ExpenseVoucher,
} from '../types/voucher.types';


type VoucherState = {
    vouchers: ExpenseVoucher[];
    categories: ExpenseCategoryOption[];

    isLoading: boolean;
    isRefreshing: boolean;
    isCategoryLoading: boolean;

    error: string | null;
    categoryError: string | null;

    page: number;
    hasMore: boolean;
    totalRecords: number;

    selectedVoucher: ExpenseVoucher | null;

    loadCategories: (centreId: number) => Promise<void>;

    loadVouchers: (
        payload: ExpenseListPayload,
        refresh?: boolean,
    ) => Promise<void>;

    setSelectedVoucher: (
        voucher: ExpenseVoucher | null,
    ) => void;

    clearVouchers: () => void;
};



const isSuccessfulResponse = (response: any): boolean => {
    return (
        response?.status === 1 ||
        response?.status === true ||
        response?.success === true
    );
};

const extractExpenseArray = (
    response: any,
): ExpenseApiItem[] => {
    const possibleLists = [
        response?.data,
        response?.data?.data,
        response?.data?.rows,
        response?.data?.expenses,
        response?.result,
    ];

    const list = possibleLists.find(item =>
        Array.isArray(item),
    );

    return Array.isArray(list) ? list : [];
};

const extractTotalRecords = (
    response: any,
    fallback: number,
): number => {
    return Number(
        response?.total ??
        response?.data?.total ??
        response?.data?.totalCount ??
        response?.data?.count ??
        response?.count ??
        fallback,
    );
};

const mapExpenseToVoucher = (
    expense: ExpenseApiItem,
): ExpenseVoucher => {
    const firstPayment =
        expense.payments?.[0] ?? null;

    const firstBankDetail =
        firstPayment?.expenseBankDetails?.[0] ?? null;

    const voucher =
        firstPayment?.voucher ?? null;

    const beneficiaryName =
        firstBankDetail?.beneficiary_name?.trim() ||
        expense.vendor?.vendorName?.trim() ||
        expense.vendor_name?.trim() ||
        'Not available';

    return {
        id: expense.id,

        voucherNo:
            voucher?.voucher_no?.trim() ||
            `EXP-${expense.id}`,

        categoryName:
            expense.category?.category_name?.trim() ||
            'Uncategorized expense',

        beneficiaryName,

        beneficiaryCode: null,

        vendorName:
            expense.vendor?.vendorName?.trim() ||
            expense.vendor_name?.trim() ||
            '',

        expenseDate:
            expense.expense_date ||
            expense.created_at,

        createdAt:
            expense.created_at,

        grossAmount: Number(
            expense.gross_amount || 0,
        ),

        netPayable: Number(
            expense.net_payable || 0,
        ),

        paymentMode:
            expense.payment_mode || 'BANK',

        status:
            expense.status || 'CREATED',

        remarks:
            expense.remarks?.trim() || '',

        bankName:
            firstBankDetail?.bank_name?.trim() || '',

        accountNumber:
            firstBankDetail?.account_number?.trim() || '',

        transactionReference:
            firstBankDetail?.transaction_ref?.trim() || '',

        commentsCount: Number(
            expense.total_comments_count || 0,
        ),

        raisedQueryCount: Number(
            expense.raised_query_count || 0,
        ),

        solvedQueryCount: Number(
            expense.solved_query_count || 0,
        ),

        currentApprovalLevel:
            expense.approvalRequest?.currentLevel ?? null,

        approvalMode:
            expense.approvalRequest?.approvalMode ?? null,

        attachmentCount:
            expense.attachments?.length ?? 0,

        raw: expense,
    };
};

const extractVoucherList = (
    response: any,
): ExpenseVoucher[] => {
    return extractExpenseArray(response).map(
        mapExpenseToVoucher,
    );
};

const extractCategoryArray = (
    response: any,
): any[] => {
    if (Array.isArray(response?.data)) {
        return response.data;
    }

    if (Array.isArray(response?.data?.data)) {
        return response.data.data;
    }

    if (Array.isArray(response?.result)) {
        return response.result;
    }

    if (Array.isArray(response)) {
        return response;
    }

    return [];
};

export const useVoucherStore =
    create<VoucherState>(set => ({
        vouchers: [],
        categories: [],

        isLoading: false,
        isRefreshing: false,
        isCategoryLoading: false,

        error: null,
        categoryError: null,

        page: 1,
        hasMore: true,
        totalRecords: 0,

        selectedVoucher: null,

        loadCategories: async centreId => {
            set({
                isCategoryLoading: true,
                categoryError: null,
            });

            try {
                const response =
                    await expenseApi.getAllExpenseCategoryByCentre(
                        centreId,
                    );

                console.log(
                    'EXPENSE CATEGORY RESPONSE:',
                    JSON.stringify(response, null, 2),
                );

                if (
                    response?.status !== undefined &&
                    !isSuccessfulResponse(response)
                ) {
                    throw new Error(
                        response?.message ||
                        'Unable to load expense categories',
                    );
                }

                const rawCategories =
                    extractCategoryArray(response);

                const categories: ExpenseCategoryOption[] =
                    rawCategories
                        .map((item: any) => ({
                            id: Number(item?.id),

                            category_name:
                                item?.category_name?.trim() ||
                                'Unnamed category',

                            count: Number(
                                item?.count ??
                                item?.expense_count ??
                                item?.voucher_count ??
                                item?.total ??
                                0,
                            ),

                            categories_attachment:
                                Array.isArray(
                                    item?.categories_attachment,
                                )
                                    ? item.categories_attachment
                                    : [],
                        }))
                        .filter(
                            category =>
                                Number.isFinite(category.id) &&
                                category.id > 0,
                        );

                set({
                    categories,
                    isCategoryLoading: false,
                    categoryError: null,
                });
            } catch (error: any) {
                set({
                    categories: [],
                    isCategoryLoading: false,

                    categoryError:
                        error?.response?.data?.message ||
                        error?.message ||
                        'Unable to load expense categories',
                });
            }
        },

        loadVouchers: async (
            payload,
            refresh = false,
        ) => {
            set({
                isLoading: !refresh,
                isRefreshing: refresh,
                error: null,
            });

            try {
                console.log(
                    'VOUCHER LIST PAYLOAD:',
                    payload,
                );

                const response =
                    await expenseApi.getAllExpense(payload);

                // console.log(
                //     'VOUCHER LIST RESPONSE:',
                //     JSON.stringify(response, null, 2),
                // );

                if (!isSuccessfulResponse(response)) {
                    throw new Error(
                        response?.message ||
                        'Unable to load payment vouchers',
                    );
                }

                const vouchers =
                    extractVoucherList(response);

                const totalRecords =
                    extractTotalRecords(
                        response,
                        vouchers.length,
                    );

                const currentPage =
                    payload.page ?? 1;

                const pageSize =
                    payload.limit ?? 20;

                set({
                    vouchers,
                    isLoading: false,
                    isRefreshing: false,
                    error: null,

                    page: currentPage,
                    totalRecords,

                    hasMore:
                        currentPage * pageSize <
                        totalRecords,
                });
            } catch (error: any) {
                set({
                    vouchers: [],
                    isLoading: false,
                    isRefreshing: false,
                    totalRecords: 0,

                    error:
                        error?.response?.data?.message ||
                        error?.message ||
                        'Unable to load payment vouchers',
                });
            }
        },

        setSelectedVoucher: voucher => {
            set({
                selectedVoucher: voucher,
            });
        },

        clearVouchers: () => {
            set({
                vouchers: [],
                categories: [],

                isLoading: false,
                isRefreshing: false,
                isCategoryLoading: false,

                error: null,
                categoryError: null,

                page: 1,
                hasMore: true,
                totalRecords: 0,

                selectedVoucher: null,
            });
        },
    }));