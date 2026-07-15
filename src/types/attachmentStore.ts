// src/store/attachmentStore.ts

import { create } from 'zustand';

import { attachmentApi } from '../api/attachment.api';

import {
    AttachmentUploadResponse,
    CategoryAttachmentConfig,
    SelectedAttachmentFile,
    SelectedAttachmentMap,
} from '../types/attachment.types';

type AttachmentValidationResult = {
    valid: boolean;
    message: string;
    missingAttachmentTypes: string[];
};

type UploadExpenseAttachmentsPayload = {
    expenseId: number;
    categoryId: number;
    attachmentConfigs: CategoryAttachmentConfig[];
};

type AttachmentStore = {
    selectedFiles: SelectedAttachmentMap;

    isUploading: boolean;

    uploadError: string | null;
    uploadMessage: string | null;

    uploadResponse: AttachmentUploadResponse | null;

    setSelectedFile: (
        attachmentType: string,
        file: SelectedAttachmentFile,
    ) => void;

    removeSelectedFile: (
        attachmentType: string,
    ) => void;

    getSelectedFile: (
        attachmentType: string,
    ) => SelectedAttachmentFile | null;

    hasAnySelectedFile: () => boolean;

    validateMandatoryAttachments: (
        attachmentConfigs: CategoryAttachmentConfig[],
    ) => AttachmentValidationResult;

    uploadAttachments: (
        payload: UploadExpenseAttachmentsPayload,
    ) => Promise<{
        success: boolean;
        message: string;
    }>;

    clearUploadMessages: () => void;

    resetAttachments: () => void;
};

const normalizeAttachmentType = (
    attachmentType: string,
): string => {
    return String(attachmentType || '').trim();
};

const isSuccessfulResponse = (
    response: AttachmentUploadResponse,
): boolean => {
    return (
        response?.status === 1 ||
        response?.status === true ||
        response?.success === true
    );
};

const getErrorMessage = (
    error: unknown,
    fallback: string,
): string => {
    if (
        typeof error === 'object' &&
        error !== null
    ) {
        const typedError = error as {
            response?: {
                data?: {
                    message?: string;
                    error?: string;
                };
            };
            message?: string;
        };

        return (
            typedError.response?.data?.message ||
            typedError.response?.data?.error ||
            typedError.message ||
            fallback
        );
    }

    return fallback;
};

const buildAttachmentFormData = (
    expenseId: number,
    categoryId: number,
    attachmentConfigs: CategoryAttachmentConfig[],
    selectedFiles: SelectedAttachmentMap,
): FormData => {
    const formData = new FormData();

    formData.append(
        'expense_id',
        String(expenseId),
    );

    formData.append(
        'category_id',
        String(categoryId),
    );

    const appendedTypes =
        new Set<string>();

    attachmentConfigs.forEach(config => {
        const attachmentType =
            normalizeAttachmentType(
                config.attachmentType,
            );

        if (
            !attachmentType ||
            appendedTypes.has(attachmentType)
        ) {
            return;
        }

        const file =
            selectedFiles[attachmentType];

        if (!file) {
            return;
        }

        formData.append(
            attachmentType,
            {
                uri: file.uri,
                name: file.name,
                type:
                    file.type ||
                    'application/octet-stream',
            } as any,
        );

        appendedTypes.add(attachmentType);
    });

    return formData;
};

export const useAttachmentStore =
    create<AttachmentStore>((set, get) => ({
        selectedFiles: {},

        isUploading: false,

        uploadError: null,
        uploadMessage: null,

        uploadResponse: null,

        setSelectedFile: (
            attachmentType,
            file,
        ) => {
            const normalizedType =
                normalizeAttachmentType(
                    attachmentType,
                );

            if (!normalizedType) {
                return;
            }

            set(state => ({
                selectedFiles: {
                    ...state.selectedFiles,
                    [normalizedType]: file,
                },

                uploadError: null,
                uploadMessage: null,
                uploadResponse: null,
            }));
        },

        removeSelectedFile: attachmentType => {
            const normalizedType =
                normalizeAttachmentType(
                    attachmentType,
                );

            if (!normalizedType) {
                return;
            }

            set(state => {
                const updatedFiles = {
                    ...state.selectedFiles,
                };

                delete updatedFiles[normalizedType];

                return {
                    selectedFiles: updatedFiles,

                    uploadError: null,
                    uploadMessage: null,
                    uploadResponse: null,
                };
            });
        },

        getSelectedFile: attachmentType => {
            const normalizedType =
                normalizeAttachmentType(
                    attachmentType,
                );

            if (!normalizedType) {
                return null;
            }

            return (
                get().selectedFiles[
                normalizedType
                ] ?? null
            );
        },

        hasAnySelectedFile: () => {
            return Object.values(
                get().selectedFiles,
            ).some(Boolean);
        },

        validateMandatoryAttachments:
            attachmentConfigs => {
                const selectedFiles =
                    get().selectedFiles;

                const missingAttachmentTypes:
                    string[] = [];

                attachmentConfigs.forEach(
                    config => {
                        const attachmentType =
                            normalizeAttachmentType(
                                config.attachmentType,
                            );

                        if (
                            !attachmentType ||
                            !config.isMandatory
                        ) {
                            return;
                        }

                        if (
                            !selectedFiles[
                            attachmentType
                            ]
                        ) {
                            missingAttachmentTypes.push(
                                attachmentType,
                            );
                        }
                    },
                );

                if (
                    missingAttachmentTypes.length >
                    0
                ) {
                    return {
                        valid: false,

                        message:
                            missingAttachmentTypes.length ===
                                1
                                ? `${missingAttachmentTypes[0]} is required.`
                                : `The following attachments are required: ${missingAttachmentTypes.join(
                                    ', ',
                                )}.`,

                        missingAttachmentTypes,
                    };
                }

                return {
                    valid: true,
                    message:
                        'Attachment validation completed successfully.',
                    missingAttachmentTypes: [],
                };
            },

        uploadAttachments: async payload => {
            const {
                expenseId,
                categoryId,
                attachmentConfigs,
            } = payload;

            const selectedFiles =
                get().selectedFiles;

            if (!expenseId) {
                const message =
                    'Expense ID is required.';

                set({
                    uploadError: message,
                    uploadMessage: null,
                });

                return {
                    success: false,
                    message,
                };
            }

            if (!categoryId) {
                const message =
                    'Expense category ID is required.';

                set({
                    uploadError: message,
                    uploadMessage: null,
                });

                return {
                    success: false,
                    message,
                };
            }

            const validation =
                get().validateMandatoryAttachments(
                    attachmentConfigs,
                );

            if (!validation.valid) {
                set({
                    uploadError:
                        validation.message,
                    uploadMessage: null,
                });

                return {
                    success: false,
                    message:
                        validation.message,
                };
            }

            const hasSelectedFile =
                Object.values(
                    selectedFiles,
                ).some(Boolean);

            if (!hasSelectedFile) {
                const message =
                    'Please select at least one attachment.';

                set({
                    uploadError: message,
                    uploadMessage: null,
                });

                return {
                    success: false,
                    message,
                };
            }

            const formData =
                buildAttachmentFormData(
                    expenseId,
                    categoryId,
                    attachmentConfigs,
                    selectedFiles,
                );

            set({
                isUploading: true,

                uploadError: null,
                uploadMessage: null,

                uploadResponse: null,
            });

            try {
                const response =
                    await attachmentApi.uploadExpenseAttachments(
                        formData,
                    );

                if (
                    !isSuccessfulResponse(response)
                ) {
                    throw new Error(
                        response?.message ||
                        'Unable to upload attachments.',
                    );
                }

                const message =
                    response?.message ||
                    'Attachments uploaded successfully.';

                set({
                    selectedFiles: {},

                    isUploading: false,

                    uploadError: null,
                    uploadMessage: message,

                    uploadResponse: response,
                });

                return {
                    success: true,
                    message,
                };
            } catch (error: unknown) {
                const message =
                    getErrorMessage(
                        error,
                        'Unable to upload attachments.',
                    );

                set({
                    isUploading: false,

                    uploadError: message,
                    uploadMessage: null,

                    uploadResponse: null,
                });

                return {
                    success: false,
                    message,
                };
            }
        },

        clearUploadMessages: () => {
            set({
                uploadError: null,
                uploadMessage: null,
                uploadResponse: null,
            });
        },

        resetAttachments: () => {
            set({
                selectedFiles: {},

                isUploading: false,

                uploadError: null,
                uploadMessage: null,

                uploadResponse: null,
            });
        },
    }));