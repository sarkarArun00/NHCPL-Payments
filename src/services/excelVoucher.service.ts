// src/services/excelVoucher.service.ts

import * as XLSX from 'xlsx';

import {
    ExcelVoucherCategoryType,
    ExcelVoucherRawRow,
    ExcelVoucherRow,
    ExcelVoucherValidationResult,
} from '../types/excelVoucher.types';

const SALARY_REQUIRED_HEADERS = [
    'Beneficiary Name',
    'Beneficiary Code',
    'Amount',
    'Narration',
];

const NON_SALARY_REQUIRED_HEADERS = [
    'Beneficiary Name',
    'Amount',
    'Narration',
];

const normalizeHeader = (value: unknown): string => {
    return String(value ?? '')
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase();
};

const normalizeText = (value: unknown): string => {
    return String(value ?? '').trim();
};

const getRowValue = (
    row: ExcelVoucherRawRow,
    expectedHeader: string,
): unknown => {
    const normalizedExpectedHeader =
        normalizeHeader(expectedHeader);

    const matchingKey = Object.keys(row).find(
        key =>
            normalizeHeader(key) ===
            normalizedExpectedHeader,
    );

    return matchingKey
        ? row[matchingKey]
        : undefined;
};

const parseAmount = (value: unknown): number => {
    if (
        value === null ||
        value === undefined ||
        value === ''
    ) {
        return 0;
    }

    if (typeof value === 'number') {
        return Number.isFinite(value)
            ? value
            : 0;
    }

    const cleanedValue = String(value)
        .replace(/₹/g, '')
        .replace(/,/g, '')
        .trim();

    const parsedAmount = Number(cleanedValue);

    return Number.isFinite(parsedAmount)
        ? parsedAmount
        : 0;
};

const getRequiredHeaders = (
    categoryType: ExcelVoucherCategoryType,
): string[] => {
    return categoryType === 'SALARY'
        ? SALARY_REQUIRED_HEADERS
        : NON_SALARY_REQUIRED_HEADERS;
};

const validateHeaders = (
    headers: string[],
    requiredHeaders: string[],
): string[] => {
    const normalizedHeaders = headers.map(
        normalizeHeader,
    );

    return requiredHeaders.filter(
        requiredHeader =>
            !normalizedHeaders.includes(
                normalizeHeader(requiredHeader),
            ),
    );
};

const validateRows = (
    rawRows: ExcelVoucherRawRow[],
    categoryType: ExcelVoucherCategoryType,
): ExcelVoucherRow[] => {
    const beneficiaryNameOccurrences =
        new Map<string, number>();

    const beneficiaryCodeOccurrences =
        new Map<string, number>();

    rawRows.forEach(row => {
        const beneficiaryName = normalizeText(
            getRowValue(row, 'Beneficiary Name'),
        ).toLowerCase();

        if (beneficiaryName) {
            beneficiaryNameOccurrences.set(
                beneficiaryName,
                (beneficiaryNameOccurrences.get(
                    beneficiaryName,
                ) ?? 0) + 1,
            );
        }

        if (categoryType === 'SALARY') {
            const beneficiaryCode = normalizeText(
                getRowValue(
                    row,
                    'Beneficiary Code',
                ),
            ).toLowerCase();

            if (beneficiaryCode) {
                beneficiaryCodeOccurrences.set(
                    beneficiaryCode,
                    (beneficiaryCodeOccurrences.get(
                        beneficiaryCode,
                    ) ?? 0) + 1,
                );
            }
        }
    });

    return rawRows.map((row, index) => {
        const rowNumber = index + 2;

        const beneficiaryName = normalizeText(
            getRowValue(
                row,
                'Beneficiary Name',
            ),
        );

        const beneficiaryCode =
            categoryType === 'SALARY'
                ? normalizeText(
                    getRowValue(
                        row,
                        'Beneficiary Code',
                    ),
                )
                : '';

        const amount = parseAmount(
            getRowValue(row, 'Amount'),
        );

        const narration = normalizeText(
            getRowValue(row, 'Narration'),
        );

        const errors: string[] = [];

        if (!beneficiaryName) {
            errors.push(
                'Beneficiary Name is required.',
            );
        }

        

        if (
            categoryType === 'SALARY' &&
            !beneficiaryCode
        ) {
            errors.push(
                'Beneficiary Code is required for salary vouchers.',
            );
        }

        if (
            categoryType === 'SALARY' &&
            beneficiaryCode &&
            (beneficiaryCodeOccurrences.get(
                beneficiaryCode.toLowerCase(),
            ) ?? 0) > 1
        ) {
            errors.push(
                'Duplicate Beneficiary Code found.',
            );
        }

        if (!amount || amount <= 0) {
            errors.push(
                'Amount must be greater than zero.',
            );
        }

        return {
            rowNumber,
            beneficiaryName,
            beneficiaryCode:
                beneficiaryCode || null,
            amount,
            narration,
            isValid: errors.length === 0,
            errors,
            raw: row,
        };
    });
};

export const excelVoucherService = {
    readAndValidateFile: async (
        fileUri: string,
        categoryType: ExcelVoucherCategoryType,
    ): Promise<ExcelVoucherValidationResult> => {
        if (!fileUri) {
            throw new Error(
                'Excel file URI is missing.',
            );
        }

        const fileResponse =
            await fetch(fileUri);

        if (!fileResponse.ok) {
            throw new Error(
                'Unable to read the selected Excel file.',
            );
        }

        const arrayBuffer =
            await fileResponse.arrayBuffer();

        const workbook = XLSX.read(
            arrayBuffer,
            {
                type: 'array',
                cellDates: false,
            },
        );

        const firstSheetName =
            workbook.SheetNames[0];

        if (!firstSheetName) {
            throw new Error(
                'The selected Excel file does not contain any worksheet.',
            );
        }

        const worksheet =
            workbook.Sheets[firstSheetName];

        if (!worksheet) {
            throw new Error(
                'Unable to read the first worksheet.',
            );
        }

        const rawRows =
            XLSX.utils.sheet_to_json<ExcelVoucherRawRow>(
                worksheet,
                {
                    defval: '',
                    raw: false,
                },
            );

        if (rawRows.length === 0) {
            throw new Error(
                'The selected Excel file does not contain any data rows.',
            );
        }

        const headerRows =
            XLSX.utils.sheet_to_json<unknown[]>(
                worksheet,
                {
                    header: 1,
                    blankrows: false,
                    defval: '',
                },
            );

        const headers = Array.isArray(
            headerRows[0],
        )
            ? headerRows[0]
                .map(header =>
                    normalizeText(header),
                )
                .filter(Boolean)
            : [];

        const requiredHeaders =
            getRequiredHeaders(categoryType);

        const missingHeaders =
            validateHeaders(
                headers,
                requiredHeaders,
            );

        if (missingHeaders.length > 0) {
            return {
                rows: [],
                validRows: [],
                invalidRows: [],
                totalRows: rawRows.length,
                validCount: 0,
                invalidCount: rawRows.length,
                headers,
                missingHeaders,
            };
        }

        const rows = validateRows(
            rawRows,
            categoryType,
        );

        const validRows = rows.filter(
            row => row.isValid,
        );

        const invalidRows = rows.filter(
            row => !row.isValid,
        );

        return {
            rows,
            validRows,
            invalidRows,
            totalRows: rows.length,
            validCount: validRows.length,
            invalidCount: invalidRows.length,
            headers,
            missingHeaders: [],
        };
    },

    getRequiredHeaders,
};