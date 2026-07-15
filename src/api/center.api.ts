

import { apiClient } from './apiClient';

export const getAllCenters = async () => {
    const response = await apiClient.get(
        'global/centre/getAllCentres',
    );

    return response.data;
};

export const getLinkedCenterById =
    async (
        employeeId: number,
    ) => {
        const response =
            await apiClient.get(
                `global/employee/getEmployeeById/${employeeId}`,
            );

        return response.data;
    };

