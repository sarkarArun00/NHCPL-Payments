import { apiClient } from './apiClient';
import { ApiResponse } from '../types/api.types';

export type DashboardSummaryRequest = {
    center_id: number;
    user_id: number;
    from_date?: string;
    to_date?: string;
};

export type DashboardSummaryResponseData = {
    dateRange: {
        from: string;
        to: string;
    };

    totals: {
        total_settled_amount: number;
        percentage_change: number;
    };

    counts: {
        pending: number;
        approved: number;
        rejected: number;
        settled: number;
        failed: number;
    };

    comments: {
        queriesRaised: number;
        resolvedComments: number;
    };

    last_week_data: {
        rejected: number;
        failed: number;
    };
};

export const dashboardApi = {
    getSummary: async (
        payload: DashboardSummaryRequest,
    ): Promise<
        ApiResponse<DashboardSummaryResponseData>
    > => {
        const response =
            await apiClient.post<
                ApiResponse<DashboardSummaryResponseData>
            >(
                '/accounts/get-all-summary',
                payload,
            );

        return response.data;
    },
};