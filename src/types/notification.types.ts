export type GeneralNotification = {
    id: string;

    pageId:
    | number
    | string
    | null;

    taskId:
    | number
    | string
    | null;

    message: string;

    srcEmp: number | null;
    tgtEmp: number | null;

    module: string | null;
    srcModule: string | null;

    notificationType:
    | string
    | null;

    runnableQuery:
    | string
    | null;

    pageLink:
    | string
    | null;

    runnableStatus:
    | string
    | number
    | boolean
    | null;

    denialQuery:
    | string
    | null;

    referenceId:
    | string
    | null;

    status:
    | string
    | number
    | boolean
    | null;

    isRead: boolean;

    createdAt: string;
    updatedAt: string;
};