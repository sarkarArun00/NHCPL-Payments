export type RejectionReason = {
    id: number;
    rejectionName: string;
    description: string;
    status: boolean;
    createdAt: string;
    updatedAt: string;
    delete_status: boolean;
};

export type RejectionReasonApiResponse =
    | RejectionReason[]
    | {
        status?: number;
        success?: boolean;
        message?: string;
        data?: RejectionReason[];
    };