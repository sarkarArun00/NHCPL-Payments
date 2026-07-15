import { create } from 'zustand';

import { getAllCenters } from '../api/center.api';
import { Center } from '../types/center.types';
import {
    getLinkedCenterById,
} from '../api/center.api';



type CenterStore = {
    centers: Center[];
    selectedCenterId: number | null;
    selectedCenter: Center | null;

    isLoadingCenters: boolean;
    centerError: string | null;

    loadCenters: (
        employeeId: number,
        sessionCenterId?: number,
    ) => Promise<void>;

    setSelectedCenter: (
        center: Center,
    ) => void;

    setDefaultCenter: (
        centerId: number,
    ) => void;

    clearCenterError: () => void;
    resetCenter: () => void;
};



function extractCenters(
    response: unknown,
): Center[] {
    const responseRecord =
        typeof response === 'object' &&
            response !== null
            ? response as Record<
                string,
                unknown
            >
            : null;

    const responseData =
        responseRecord?.data;

    const dataRecord =
        typeof responseData ===
            'object' &&
            responseData !== null &&
            !Array.isArray(responseData)
            ? responseData as Record<
                string,
                unknown
            >
            : null;

    const nestedData =
        dataRecord?.data;

    const nestedDataRecord =
        typeof nestedData ===
            'object' &&
            nestedData !== null &&
            !Array.isArray(nestedData)
            ? nestedData as Record<
                string,
                unknown
            >
            : null;

    const possibleLists: unknown[] = [
        dataRecord?.CentreMasters,
        responseRecord?.CentreMasters,
        nestedDataRecord
            ?.CentreMasters,
    ];

    const list =
        possibleLists.find(
            item =>
                Array.isArray(item),
        );

    if (!Array.isArray(list)) {
        return [];
    }

    return list
        .map(
            (
                item,
            ): Center | null => {
                const centerRecord =
                    typeof item ===
                        'object' &&
                        item !== null
                        ? item as Record<
                            string,
                            unknown
                        >
                        : null;

                if (!centerRecord) {
                    return null;
                }

                const id = Number(
                    centerRecord.id ?? 0,
                );

                if (id <= 0) {
                    return null;
                }

                const name =
                    typeof centerRecord
                        .name ===
                        'string'
                        ? centerRecord
                            .name
                            .trim()
                        : '';

                return {
                    id,

                    ...(name
                        ? { name }
                        : {}),

                    isDefault:
                        centerRecord
                            .isDefault ===
                        true,

                    ...(typeof centerRecord
                        .code ===
                        'string'
                        ? {
                            code:
                                centerRecord
                                    .code,
                        }
                        : {}),
                };
            },
        )
        .filter(
            (
                center,
            ): center is Center =>
                center !== null,
        );
}

export const useCenterStore =
    create<CenterStore>((set, get) => ({
        centers: [],
        selectedCenterId: null,
        selectedCenter: null,

        isLoadingCenters: false,
        centerError: null,

        loadCenters: async (
            employeeId: number,
            sessionCenterId?: number,
        ) => {
            if (employeeId <= 0) {
                set({
                    centers: [],
                    selectedCenterId:
                        null,
                    selectedCenter: null,
                    isLoadingCenters:
                        false,
                    centerError:
                        'Employee ID is not available.',
                });

                return;
            }

            try {
                set({
                    isLoadingCenters: true,
                    centerError: null,
                });

                const response =
                    await getLinkedCenterById(
                        employeeId,
                    );

                const centers =
                    extractCenters(response);

                const currentSelectedId = Number(
                    get().selectedCenterId ?? 0,
                );

                const currentSelectedCenter =
                    centers.find(
                        center =>
                            Number(center.id) ===
                            currentSelectedId,
                    ) ?? null;

                const defaultCenter =
                    centers.find(
                        center =>
                            center.isDefault === true,
                    ) ?? null;

                const sessionCenter =
                    centers.find(
                        center =>
                            Number(center.id) ===
                            Number(
                                sessionCenterId ?? 0,
                            ),
                    ) ?? null;

                const selectedCenter =
                    currentSelectedCenter ||
                    defaultCenter ||
                    sessionCenter ||
                    centers[0] ||
                    null;

                set({
                    centers,

                    selectedCenterId:
                        selectedCenter?.id ?? null,

                    selectedCenter,

                    isLoadingCenters: false,

                    centerError:
                        centers.length > 0
                            ? null
                            : 'No linked centers found for this employee.',
                });
            } catch (
            error: unknown
            ) {
                const apiError =
                    error as {
                        response?: {
                            data?: {
                                message?: string;
                            };
                        };

                        message?: string;
                    };

                set({
                    centers: [],
                    selectedCenterId:
                        null,
                    selectedCenter: null,
                    isLoadingCenters:
                        false,

                    centerError:
                        apiError
                            ?.response
                            ?.data
                            ?.message ||
                        apiError?.message ||
                        'Unable to load employee centers.',
                });
            }
        },

        setSelectedCenter: (
            center: Center,
        ) => {
            set({
                selectedCenterId:
                    Number(center.id),

                selectedCenter: center,

                centerError: null,
            });
        },

        setDefaultCenter: (
            centerId: number,
        ) => {
            const centers =
                get().centers;

            const selectedCenter =
                centers.find(
                    center =>
                        center.id === centerId,
                ) || null;

            set({
                selectedCenterId:
                    Number(centerId),

                selectedCenter,
            });
        },

        clearCenterError: () => {
            set({
                centerError: null,
            });
        },

        resetCenter: () => {
            set({
                centers: [],
                selectedCenterId: null,
                selectedCenter: null,
                isLoadingCenters: false,
                centerError: null,
            });
        },
    }));