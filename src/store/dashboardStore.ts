import { create } from 'zustand';

import {
    expenseApi,
    ExpenseSummaryPayload,
} from '../api/expense.api';

type DashboardState = {
    summary: any;
    isLoading: boolean;
    isRefreshing: boolean;
    error: string | null;

    loadDashboard: (
        payload: ExpenseSummaryPayload,
        refresh?: boolean,
    ) => Promise<void>;

    clearDashboard: () => void;
};

const isSuccessfulResponse = (response: any): boolean => {
    return (
        response?.status === 1 ||
        response?.status === true ||
        response?.success === true
    );
};

export const useDashboardStore =
    create<DashboardState>(set => ({
        summary: null,
        isLoading: false,
        isRefreshing: false,
        error: null,

        loadDashboard: async (
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
                    'DASHBOARD SUMMARY PAYLOAD:',
                    payload,
                );

                const response =
                    await expenseApi.getAllSummary(payload);

                console.log(
                    'DASHBOARD SUMMARY RESPONSE:',
                    JSON.stringify(response, null, 2),
                );

                if (!isSuccessfulResponse(response)) {
                    throw new Error(
                        response?.message ||
                        'Unable to load payment summary',
                    );
                }

                set({
                    summary: response?.data ?? null,
                    isLoading: false,
                    isRefreshing: false,
                    error: null,
                });
            } catch (error: any) {
                set({
                    summary: null,
                    isLoading: false,
                    isRefreshing: false,
                    error:
                        error?.response?.data?.message ||
                        error?.message ||
                        'Unable to load dashboard',
                });
            }
        },

        clearDashboard: () => {
            set({
                summary: null,
                isLoading: false,
                isRefreshing: false,
                error: null,
            });
        },
    }));