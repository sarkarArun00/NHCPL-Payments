import * as XLSX from 'xlsx';

export type VoucherExcelType =
    | 'SALARY'
    | 'VENDOR';

export type ParsedVoucherExcelRow = {
    rowNumber: number;
    beneficiaryCode: string;
    beneficiaryName: string;
    amount: number;
    narration: string;
};

type RawExcelRow = Record<
    string,
    unknown
> & {
    __rowNum__?: number;
};

export type HeaderValidationResult = {
    valid: boolean;
    expectedHeaders: string[];
    actualHeaders: string[];
    message: string;
};

export type RowValidationResult = {
    valid: boolean;
    rows: ParsedVoucherExcelRow[];
    errors: string[];
};

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

const normalizeHeader = (
    value: unknown,
): string => {
    return String(value ?? '')
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase();
};

const normalizeValue = (
    value: unknown,
): string => {
    return String(value ?? '')
        .trim()
        .replace(/\s+/g, ' ');
};

const normalizeCode = (
    value: unknown,
): string => {
    return normalizeValue(value)
        .toLowerCase();
};

export const getExpectedVoucherHeaders = (
    type: VoucherExcelType,
): string[] => {
    return type === 'SALARY'
        ? SALARY_HEADERS
        : VENDOR_HEADERS;
};

const getWorksheetHeaders = (
    worksheet: XLSX.WorkSheet,
): string[] => {
    const matrix =
        XLSX.utils.sheet_to_json<unknown[]>(
            worksheet,
            {
                header: 1,
                defval: '',
                raw: false,
                blankrows: false,
            },
        );

    if (
        !Array.isArray(matrix) ||
        matrix.length === 0 ||
        !Array.isArray(matrix[0])
    ) {
        return [];
    }

    const headers = matrix[0].map(
        value =>
            String(value ?? '').trim(),
    );

    /*
     * Remove only trailing empty columns.
     * An empty column between required headers
     * will still make the format invalid.
     */
    while (
        headers.length > 0 &&
        !headers[headers.length - 1]
    ) {
        headers.pop();
    }

    return headers;
};

export const validateVoucherExcelHeaders = (
    worksheet: XLSX.WorkSheet,
    type: VoucherExcelType,
): HeaderValidationResult => {
    const actualHeaders =
        getWorksheetHeaders(worksheet);

    const expectedHeaders =
        getExpectedVoucherHeaders(type);

    if (actualHeaders.length === 0) {
        return {
            valid: false,
            actualHeaders,
            expectedHeaders,
            message:
                'Excel file is empty or the header row is missing.',
        };
    }

    const normalizedActual =
        actualHeaders.map(normalizeHeader);

    const normalizedExpected =
        expectedHeaders.map(normalizeHeader);

    const hasSameColumnCount =
        normalizedActual.length ===
        normalizedExpected.length;

    const hasCorrectOrder =
        hasSameColumnCount &&
        normalizedExpected.every(
            (expectedHeader, index) =>
                normalizedActual[index] ===
                expectedHeader,
        );

    if (!hasCorrectOrder) {
        return {
            valid: false,
            actualHeaders,
            expectedHeaders,
            message: [
                'Invalid Excel format.',
                '',
                `Expected columns: ${expectedHeaders.join(
                    ' | ',
                )}`,
                `Found columns: ${actualHeaders.length
                    ? actualHeaders.join(' | ')
                    : 'No headers found'
                }`,
                '',
                'Please use the downloaded template without adding, removing or rearranging columns.',
            ].join('\n'),
        };
    }

    return {
        valid: true,
        actualHeaders,
        expectedHeaders,
        message: '',
    };
};

const parseAmount = (
    value: unknown,
): {
    rawValue: string;
    amount: number;
} => {
    const rawValue = String(
        value ?? '',
    )
        .replace(/,/g, '')
        .trim();

    return {
        rawValue,
        amount: Number(rawValue),
    };
};

const isCompletelyBlankRow = (
    row: RawExcelRow,
    type: VoucherExcelType,
): boolean => {
    const values =
        type === 'SALARY'
            ? [
                row['Beneficiary Name'],
                row['Beneficiary Code'],
                row.Amount,
                row.Narration,
            ]
            : [
                row['Beneficiary Name'],
                row.Amount,
                row.Narration,
            ];

    return values.every(
        value =>
            normalizeValue(value) === '',
    );
};

export const validateVoucherExcelRows = (
    worksheet: XLSX.WorkSheet,
    type: VoucherExcelType,
): RowValidationResult => {
    const rawRows =
        XLSX.utils.sheet_to_json<RawExcelRow>(
            worksheet,
            {
                defval: '',
                raw: false,
                blankrows: false,
            },
        );

    const errors: string[] = [];
    const parsedRows:
        ParsedVoucherExcelRow[] = [];

    /*
     * Duplicate names are intentionally not checked.
     *
     * Salary and Vendor Excel files may contain
     * multiple people/vendors with the same name.
     */
    const salaryCodeRows =
        new Map<string, number>();

    rawRows.forEach(
        (
            rawRow: RawExcelRow,
            index: number,
        ) => {
            if (
                isCompletelyBlankRow(
                    rawRow,
                    type,
                )
            ) {
                return;
            }

            const rowNumber =
                typeof rawRow.__rowNum__ ===
                    'number'
                    ? rawRow.__rowNum__ + 1
                    : index + 2;

            const beneficiaryName =
                normalizeValue(
                    rawRow['Beneficiary Name'],
                );

            const beneficiaryCode =
                type === 'SALARY'
                    ? normalizeValue(
                        rawRow[
                        'Beneficiary Code'
                        ],
                    )
                    : '';

            const narration =
                normalizeValue(
                    rawRow.Narration,
                );

            const amountResult =
                parseAmount(rawRow.Amount);

            if (!beneficiaryName) {
                errors.push(
                    `Row ${rowNumber}: Beneficiary Name is required.`,
                );
            }

            if (
                type === 'SALARY' &&
                !beneficiaryCode
            ) {
                errors.push(
                    `Row ${rowNumber}: Beneficiary Code is required for Salary.`,
                );
            }

            if (!amountResult.rawValue) {
                errors.push(
                    `Row ${rowNumber}: Amount is required.`,
                );
            } else if (
                !Number.isFinite(
                    amountResult.amount,
                ) ||
                amountResult.amount <= 0
            ) {
                errors.push(
                    `Row ${rowNumber}: Amount must be a valid number greater than 0.`,
                );
            }

            if (!narration) {
                errors.push(
                    `Row ${rowNumber}: Narration is required 11111.`,
                );
            }

            /*
             * Check duplicate code only for Salary.
             * Do not check duplicate beneficiary names.
             */
            if (
                type === 'SALARY' &&
                beneficiaryCode
            ) {
                const normalizedCode =
                    normalizeCode(
                        beneficiaryCode,
                    );

                const firstRowNumber =
                    salaryCodeRows.get(
                        normalizedCode,
                    );

                if (firstRowNumber) {
                    errors.push(
                        `Row ${rowNumber}: Beneficiary Code "${beneficiaryCode}" is already used in row ${firstRowNumber}.`,
                    );
                } else {
                    salaryCodeRows.set(
                        normalizedCode,
                        rowNumber,
                    );
                }
            }

            parsedRows.push({
                rowNumber,
                beneficiaryCode,
                beneficiaryName,
                amount:
                    amountResult.amount,
                narration,
            });
        },
    );

    if (parsedRows.length === 0) {
        errors.push(
            'No voucher data found in the Excel file.',
        );
    }

    return {
        valid: errors.length === 0,
        rows: parsedRows,
        errors,
    };
};