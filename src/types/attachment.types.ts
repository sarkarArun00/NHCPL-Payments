export type CategoryAttachmentConfig = {
    id?: number;
    attachmentType: string;
    isMandatory: boolean;
};

export type SelectedAttachmentFile = {
    uri: string;
    name: string;
    type?: string | null;
    size?: number | null;
};

export type SelectedAttachmentMap = Record<
    string,
    SelectedAttachmentFile
>;

export type ExpenseAttachment = {
    id?: number;
    expense_id?: number;
    attachment_type?: string;
    attachmentType?: string;
    file_name?: string;
    filename?: string;
    file_url?: string;
    url?: string;
    created_at?: string;
};

export type AttachmentUploadResponse = {
    status: number | boolean;
    success?: boolean;
    message?: string;
    data?: unknown;
};