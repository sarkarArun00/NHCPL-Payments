export type DashboardDateRange = {
    from: string;
    to: string;
};

export type DashboardTotals = {
    total_settled_amount: number;
    percentage_change: number;
};

export type DashboardCounts = {
    pending: number;
    approved: number;
    rejected: number;
    settled: number;
    failed: number;
};

export type DashboardComments = {
    queriesRaised: number;
    resolvedComments: number;
};

export type DashboardLastWeekData = {
    rejected: number;
    failed: number;
};

export type DashboardSummary = {
    dateRange: DashboardDateRange;
    totals: DashboardTotals;
    counts: DashboardCounts;
    comments: DashboardComments;
    last_week_data: DashboardLastWeekData;
};

export type DashboardSummaryPayload = {
    center_id: number;
    user_id: number;
    payment_mode?: string;
    from_date: string;
    to_date: string;
};