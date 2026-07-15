export type Center = {
    id: number;

    name?: string;

    centre_name?: string;
    center_name?: string;
    centreName?: string;
    centerName?: string;

    code?: string;
    status?: boolean | number;

    isDefault?:
    | boolean
    | null;
};

export type CenterState = {
    centers: Center[];
    selectedCenterId: number | null;
    selectedCenter: Center | null;
    isLoadingCenters: boolean;
    centerError: string | null;
};