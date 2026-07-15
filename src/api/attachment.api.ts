// src/api/attachment.api.ts

import { apiClient } from './apiClient';

import {
    AttachmentUploadResponse,
} from '../types/attachment.types';

export const attachmentApi = {
    uploadExpenseAttachments: async (
        formData: FormData,
    ): Promise<AttachmentUploadResponse> => {
        const response =
            await apiClient.post<AttachmentUploadResponse>(
                'accounts/expense/upload-attachments',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                },
            );

        return response.data;
    },
};