import { Platform } from 'react-native';
import * as XLSX from 'xlsx';
import ReactNativeBlobUtil from 'react-native-blob-util';

export type VoucherTemplateType =
    | 'SALARY'
    | 'VENDOR';

type DownloadVoucherTemplateParams = {
    type: VoucherTemplateType;
    categoryName?: string;
};

type DownloadVoucherTemplateResult = {
    fileName: string;
    fileUri: string;
};

const EXCEL_MIME_TYPE =
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const SALARY_HEADERS = [
    'Beneficiary Name',
    'Beneficiary Code',
    'Amount',
    'Narration',
];

const VENDOR_HEADERS = [
    'Beneficiary Name',
    'Amount',
    'Narration',
];

const sanitizeFileName = (
    value: string,
): string => {
    return value
        .trim()
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, '_');
};

const getTemplateHeaders = (
    type: VoucherTemplateType,
): string[] => {
    return type === 'SALARY'
        ? SALARY_HEADERS
        : VENDOR_HEADERS;
};

const getTemplateColumnWidths = (
    type: VoucherTemplateType,
): XLSX.ColInfo[] => {
    if (type === 'SALARY') {
        return [
            { wch: 30 },
            { wch: 24 },
            { wch: 16 },
            { wch: 42 },
        ];
    }

    return [
        { wch: 30 },
        { wch: 16 },
        { wch: 42 },
    ];
};

export const downloadVoucherTemplate =
    async ({
        type,
        categoryName,
    }: DownloadVoucherTemplateParams):
        Promise<DownloadVoucherTemplateResult> => {
        const headers =
            getTemplateHeaders(type);

        /*
         * Keep the first row as the exact header row.
         * No sample data is added because it could
         * accidentally be submitted as voucher data.
         */
        const worksheet =
            XLSX.utils.aoa_to_sheet([
                headers,
            ]);

        worksheet['!cols'] =
            getTemplateColumnWidths(type);

        worksheet['!autofilter'] = {
            ref:
                type === 'SALARY'
                    ? 'A1:D1'
                    : 'A1:C1',
        };

        const workbook =
            XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            type === 'SALARY'
                ? 'Salary Voucher'
                : 'Vendor Voucher',
        );

        const workbookBytes =
            XLSX.write(workbook, {
                bookType: 'xlsx',
                type: 'buffer',
            }) as Uint8Array;

        const defaultName =
            type === 'SALARY'
                ? 'Salary_Payment_Voucher'
                : 'Vendor_Payment_Voucher';

        const safeCategoryName =
            sanitizeFileName(
                categoryName || defaultName,
            );

        const fileName =
            `${safeCategoryName}_Template.xlsx`;

        const temporaryPath =
            `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/` +
            `${Date.now()}_${fileName}`;

        try {
            await ReactNativeBlobUtil.fs.writeFile(
                temporaryPath,
                Array.from(workbookBytes),
                'ascii',
            );

            if (Platform.OS === 'android') {
                const downloadedUri =
                    await ReactNativeBlobUtil
                        .MediaCollection
                        .copyToMediaStore(
                            {
                                name: fileName,
                                parentFolder:
                                    'Nirnayan Accounts',
                                mimeType:
                                    EXCEL_MIME_TYPE,
                            },
                            'Download',
                            temporaryPath,
                        );

                await ReactNativeBlobUtil.fs
                    .unlink(temporaryPath)
                    .catch(() => {
                        // Ignore temporary-file cleanup failure.
                    });

                return {
                    fileName,
                    fileUri:
                        String(downloadedUri),
                };
            }

            /*
             * On iOS, keep the generated file
             * inside the application's Documents folder.
             */
            return {
                fileName,
                fileUri:
                    `file://${temporaryPath}`,
            };
        } catch (error) {
            await ReactNativeBlobUtil.fs
                .unlink(temporaryPath)
                .catch(() => {
                    // Ignore cleanup failure.
                });

            console.error(
                'Voucher template download error:',
                error,
            );

            throw new Error(
                'Unable to generate the Excel template.',
            );
        }
    };