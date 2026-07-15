import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  MaterialDesignIcons,
} from '@react-native-vector-icons/material-design-icons/static';
import {
  pick,
} from '@react-native-documents/picker';
import {useNavigation} from '@react-navigation/native';

import {Colors} from '../../constants/colors';
import {useAuthStore} from '../../store/authStore';
import {useVoucherStore} from '../../store/voucherStore';
import {useCreateVoucherStore} from '../../store/createVoucherStore';
import {
  ExcelVoucherRow,
} from '../../types/excelVoucher.types';
import {
  downloadVoucherTemplate,
} from '../../utils/voucherTemplateDownload';
import {useCenterStore} from '../../store/centerStore';


const EXCEL_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

type BulkVoucherFailedRow = {
  row: number;
  error: string;
};

export default function CreateVoucherScreen() {
  const navigation = useNavigation();

  const session = useAuthStore(
    state => state.session,
  );

  const selectedCenterId =
  useCenterStore(
    state => state.selectedCenterId,
  );

  const {
    categories,
    isCategoryLoading,
    categoryError,
    loadCategories,
  } = useVoucherStore();

  const {
    selectedCategoryId,
    selectedCategoryName,
    categoryType,

    selectedFile,

    previewRows,
    validRows,
    invalidRows,
    missingHeaders,

    isReadingFile,
    isSubmitting,

    fileError,
    submitError,
    uploadResponse,

    selectCategory,
    processExcelFile,
    removeSelectedFile,
    submitBulkVoucher,
    clearUploadResponse,
    resetCreateVoucher,
  } = useCreateVoucherStore();

  const [isCategoryModalVisible, setIsCategoryModalVisible] =
    useState(false);
  
  const [
  showAllFailedRows,
  setShowAllFailedRows,
] = useState(false);

  const employeeId =
    session?.employee?.id;

const centreId = Number(
  selectedCenterId ||
    session?.centreId ||
    0,
);

  const [
  isDownloadingTemplate,
  setIsDownloadingTemplate,
  ] = useState(false);
  
useEffect(() => {
  if (centreId <= 0) {
    return;
  }

  resetCreateVoucher();
  void loadCategories(centreId);
}, [
  centreId,
  loadCategories,
  resetCreateVoucher,
]);

  useEffect(() => {
  setShowAllFailedRows(false);
}, [uploadResponse]);

  const requiredHeaders = useMemo(() => {
    if (categoryType === 'SALARY') {
      return [
        'Beneficiary Name',
        'Beneficiary Code',
        'Amount',
        'Narration',
      ];
    }

    return [
      'Beneficiary Name',
      'Amount',
      'Narration',
    ];
  }, [categoryType]);

  const handleCategorySelect = useCallback(
    (category: {
      id: number;
      category_name: string;
    }) => {
      selectCategory({
        id: category.id,
        name: category.category_name,
      });

      setIsCategoryModalVisible(false);
    },
    [selectCategory],
  );

  const handleDownloadTemplate =
  useCallback(async () => {
    if (!selectedCategoryId) {
      Alert.alert(
        'Select category',
        'Please select an expense category before downloading the template.',
      );

      return;
    }

    try {
      setIsDownloadingTemplate(true);

      const templateType =
        categoryType === 'SALARY'
          ? 'SALARY'
          : 'VENDOR';

      const result =
        await downloadVoucherTemplate({
          type: templateType,
          categoryName:
            selectedCategoryName ||
            templateType,
        });

      Alert.alert(
        'Template downloaded',
        `${result.fileName} has been saved in the Downloads/Nirnayan Accounts folder.`,
      );
    } catch (error: any) {
      console.error(
        'Template download error:',
        error,
      );

      Alert.alert(
        'Download failed',
        error?.message ||
          'Unable to download the Excel template.',
      );
    } finally {
      setIsDownloadingTemplate(false);
    }
  }, [
    selectedCategoryId,
    selectedCategoryName,
    categoryType,
  ]);

  const handlePickExcelFile =
  useCallback(async () => {
    if (!selectedCategoryId) {
      Alert.alert(
        'Select category',
        'Please select an expense category before choosing an Excel file.',
      );

      return;
    }

    try {
      clearUploadResponse();

      const pickedFiles = await pick({
        allowMultiSelection: false,
        type: EXCEL_MIME_TYPES,
      });

      const pickedFile =
        pickedFiles?.[0];

      if (!pickedFile?.uri) {
        return;
      }

      await processExcelFile({
        uri: pickedFile.uri,
        name:
          pickedFile.name ||
          'payment-voucher.xlsx',
        type:
          pickedFile.type ||
          EXCEL_MIME_TYPES[0],
        size: Number(
          pickedFile.size || 0,
        ),
      });
    } catch (error: any) {
      const errorCode = String(
        error?.code ||
          error?.name ||
          '',
      );

      const isCancelled = [
        'DOCUMENT_PICKER_CANCELED',
        'OPERATION_CANCELED',
        'AbortError',
      ].includes(errorCode);

      if (isCancelled) {
        return;
      }

      console.error(
        'Document picker error:',
        error,
      );

      Alert.alert(
        'Unable to select file',
        error?.message ||
          'Something went wrong while selecting the Excel file.',
      );
    }
  }, [
    selectedCategoryId,
    clearUploadResponse,
    processExcelFile,
  ]);

  const handleSubmit =
  useCallback(async () => {
    if (!employeeId || !centreId) {
      Alert.alert(
        'Session unavailable',
        'Unable to find the logged-in employee or centre information.',
      );

      return;
    }

    if (!selectedCategoryId) {
      Alert.alert(
        'Category required',
        'Please select an expense category.',
      );

      return;
    }

    if (!selectedFile) {
      Alert.alert(
        'Excel file required',
        'Please select an XLS or XLSX file.',
      );

      return;
    }

    if (missingHeaders.length > 0) {
      Alert.alert(
        'Invalid Excel headers',
        `The following required columns are missing:\n\n${missingHeaders.join(
          '\n',
        )}`,
      );

      return;
    }

    if (invalidRows.length > 0) {
      const firstErrors = invalidRows
        .slice(0, 5)
        .map((row, index) => {
          const rowNumber =
            row.rowNumber || index + 2;

          const rowErrors =
            Array.isArray(row.errors) &&
            row.errors.length > 0
              ? row.errors.join(', ')
              : 'Invalid row';

          return `Row ${rowNumber}: ${rowErrors}`;
        })
        .join('\n');

      const remaining =
        invalidRows.length - 5;

      Alert.alert(
        'Invalid Excel rows',
        remaining > 0
          ? `${firstErrors}\n\nAnd ${remaining} more invalid row(s).`
          : firstErrors ||
              'Please correct the invalid rows and upload the Excel file again.',
      );

      return;
    }

    if (validRows.length === 0) {
      Alert.alert(
        'No valid rows',
        'The selected Excel file does not contain any valid payment voucher rows.',
      );

      return;
    }

    Alert.alert(
      'Create payment vouchers',
      `Create ${validRows.length} payment voucher${
        validRows.length === 1
          ? ''
          : 's'
      } under ${selectedCategoryName}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Create',
          onPress: async () => {
          await submitBulkVoucher({
            userId: Number(employeeId),
            centerId: Number(centreId),
          });
          },
        },
      ],
    );
  }, [
    employeeId,
    centreId,
    selectedCategoryId,
    selectedCategoryName,
    selectedFile,
    missingHeaders,
    invalidRows,
    validRows,
    submitBulkVoucher,
  ]);

/*
 * Supports both:
 *
 * response.summary
 *
 * and:
 *
 * response.data.summary
 */
const normalizedUploadResponse: any =
  uploadResponse
    ? (uploadResponse as any)?.data ??
      uploadResponse
    : null;

const apiSuccessData: any[] =
  Array.isArray(
    normalizedUploadResponse?.successData,
  )
    ? normalizedUploadResponse.successData
    : [];

const apiFailedData: BulkVoucherFailedRow[] =
  Array.isArray(
    normalizedUploadResponse?.failedData,
  )
    ? normalizedUploadResponse.failedData.map(
        (item: any) => ({
          row: Number(item?.row ?? 0),

          error: String(
            item?.error ||
              'Unable to create voucher.',
          ),
        }),
      )
    : [];

const uploadSummary =
  normalizedUploadResponse?.summary ?? {};

const totalApiRows = Number(
  uploadSummary?.total ??
    apiSuccessData.length +
      apiFailedData.length ??
    validRows.length,
);

const successfulApiRows = Number(
  uploadSummary?.success ??
    apiSuccessData.length,
);

const failedApiRows = Number(
  uploadSummary?.failed ??
    apiFailedData.length,
);

const isPartialUpload =
  successfulApiRows > 0 &&
  failedApiRows > 0;

const isCompleteUploadFailure =
  successfulApiRows === 0 &&
  failedApiRows > 0;

const uploadResultTitle =
  isCompleteUploadFailure
    ? 'Voucher creation failed'
    : isPartialUpload
      ? 'Voucher creation partially completed'
      : 'Payment vouchers created';

const uploadResultIcon =
  isCompleteUploadFailure
    ? 'close-circle-outline'
    : isPartialUpload
      ? 'alert-circle-outline'
      : 'check-circle-outline';

const uploadResultColor =
  isCompleteUploadFailure
    ? Colors.danger
    : isPartialUpload
      ? Colors.warning
      : Colors.success;

const visibleFailedRows =
  showAllFailedRows
    ? apiFailedData
    : apiFailedData.slice(0, 10);

const remainingFailedRows =
  Math.max(
    apiFailedData.length -
      visibleFailedRows.length,
    0,
  );

const canSubmit =
  Boolean(selectedCategoryId) &&
  Boolean(selectedFile) &&
  missingHeaders.length === 0 &&
  validRows.length > 0 &&
  invalidRows.length === 0 &&
  !isReadingFile &&
  !isSubmitting;

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={
          styles.contentContainer
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <MaterialDesignIcons
              name="file-excel-outline"
              size={30}
              color={Colors.primary}
            />
          </View>

          <View style={styles.introContent}>
            <Text style={styles.introTitle}>
              Bulk payment voucher
            </Text>

            <Text style={styles.introDescription}>
              Select an expense category and upload an
              XLS or XLSX file to create multiple
              payment vouchers.
            </Text>
          </View>
        </View>

        <SectionHeader
          number="1"
          title="Select expense category"
          description="The Excel format changes according to the selected category."
        />

        
        <Pressable
          style={({pressed}) => [
            styles.selector,
            pressed && styles.pressed,
          ]}
          onPress={() =>
            setIsCategoryModalVisible(true)
          }>
          <View style={styles.selectorIcon}>
            <MaterialDesignIcons
              name="shape-outline"
              size={23}
              color={Colors.primary}
            />
          </View>

          <View style={styles.selectorContent}>
            <Text style={styles.selectorLabel}>
              Expense category
            </Text>

            <Text
              style={[
                styles.selectorValue,
                !selectedCategoryName &&
                  styles.placeholderText,
              ]}
              numberOfLines={1}>
              {selectedCategoryName ||
                'Choose a category'}
            </Text>
          </View>

          {isCategoryLoading ? (
            <ActivityIndicator
              size="small"
              color={Colors.primary}
            />
          ) : (
            <MaterialDesignIcons
              name="chevron-down"
              size={24}
              color={Colors.textMuted}
            />
          )}
        </Pressable>

        {categoryError ? (
          <ErrorCard
            message={categoryError}
            actionLabel="Retry"
            onAction={() => {
              if (centreId) {
                loadCategories(centreId);
              }
            }}
          />
        ) : null}

        <Pressable
          disabled={
            !selectedCategoryId ||
            isDownloadingTemplate
          }
          style={({pressed}) => [
    styles.templateButton,

    !selectedCategoryId ||
    isDownloadingTemplate
      ? styles.templateButtonDisabled
      : undefined,

    pressed &&
    Boolean(selectedCategoryId) &&
    !isDownloadingTemplate
      ? styles.pressed
      : undefined,
  ]}
          onPress={handleDownloadTemplate}>
          {isDownloadingTemplate ? (
            <ActivityIndicator
              size="small"
              color={Colors.primary}
            />
          ) : (
            <MaterialDesignIcons
              name="file-excel-outline"
              size={22}
              color={
                selectedCategoryId
                  ? Colors.primary
                  : Colors.textMuted
              }
            />
          )}

          <Text
            style={[
              styles.templateButtonText,

              !selectedCategoryId &&
                styles.templateButtonTextDisabled,
            ]}>
            {isDownloadingTemplate
              ? 'Generating template...'
              : categoryType === 'SALARY'
                ? 'Download Salary Template'
                : 'Download Vendor Template'}
          </Text>

          {!isDownloadingTemplate ? (
            <MaterialDesignIcons
              name="download"
              size={21}
              color={
                selectedCategoryId
                  ? Colors.primary
                  : Colors.textMuted
              }
            />
            ) : null}
          </Pressable>
        
        {selectedCategoryId ? (
          <View style={styles.templateCard}>
            <View style={styles.templateHeader}>
              <View style={styles.templateIcon}>
                <MaterialDesignIcons
                  name="table-large"
                  size={21}
                  color={Colors.info}
                />
              </View>

              <View style={styles.templateHeaderContent}>
                <Text style={styles.templateTitle}>
                  {categoryType === 'SALARY'
                    ? 'Salary Excel format'
                    : 'Standard Excel format'}
                </Text>

                <Text style={styles.templateSubtitle}>
                  Required column names
                </Text>
              </View>
            </View>

            <View style={styles.headerList}>
              {requiredHeaders.map(
                (header, index) => (
                  <View
                    key={header}
                    style={styles.headerItem}>
                    <View style={styles.headerIndex}>
                      <Text
                        style={styles.headerIndexText}>
                        {index + 1}
                      </Text>
                    </View>

                    <Text style={styles.headerName}>
                      {header}
                    </Text>
                  </View>
                ),
              )}
            </View>

            <View style={styles.templateNote}>
              <MaterialDesignIcons
                name="information-outline"
                size={18}
                color={Colors.warning}
              />

              <Text style={styles.templateNoteText}>
                Column names must match exactly. Do not
                leave Beneficiary Name, Amount or
                Narration blank.
              </Text>
            </View>
          </View>
        ) : null}

        <SectionHeader
          number="2"
          title="Upload Excel file"
          description="Only XLS and XLSX files are supported."
        />

        {!selectedFile ? (
          <Pressable
            style={({pressed}) => [
              styles.uploadBox,
              pressed && styles.pressed,
              !selectedCategoryId &&
                styles.disabledUploadBox,
            ]}
            disabled={
              !selectedCategoryId ||
              isReadingFile
            }
            onPress={handlePickExcelFile}>
            <View style={styles.uploadIcon}>
              {isReadingFile ? (
                <ActivityIndicator
                  size="large"
                  color={Colors.primary}
                />
              ) : (
                <MaterialDesignIcons
                  name="cloud-upload-outline"
                  size={38}
                  color={Colors.primary}
                />
              )}
            </View>

            <Text style={styles.uploadTitle}>
              {isReadingFile
                ? 'Reading Excel file...'
                : 'Choose Excel file'}
            </Text>

            <Text style={styles.uploadSubtitle}>
              Browse your device storage, Google Drive
              or iCloud Files
            </Text>

            <View style={styles.fileTypeBadge}>
              <Text style={styles.fileTypeText}>
                XLS · XLSX
              </Text>
            </View>
          </Pressable>
        ) : (
          <View style={styles.selectedFileCard}>
            <View style={styles.fileIcon}>
              <MaterialDesignIcons
                name="microsoft-excel"
                size={28}
                color={Colors.success}
              />
            </View>

            <View style={styles.fileContent}>
              <Text
                style={styles.fileName}
                numberOfLines={1}>
                {selectedFile.name}
              </Text>

              <Text style={styles.fileMeta}>
                {formatFileSize(
                  selectedFile.size,
                )}
              </Text>
            </View>

            {isReadingFile ? (
              <ActivityIndicator
                size="small"
                color={Colors.primary}
              />
            ) : (
              <Pressable
                hitSlop={10}
                onPress={removeSelectedFile}>
                <MaterialDesignIcons
                  name="delete-outline"
                  size={23}
                  color={Colors.danger}
                />
              </Pressable>
            )}
          </View>
        )}

        {fileError ? (
          <ErrorCard
            message={fileError}
          />
        ) : null}

        {missingHeaders.length > 0 ? (
          <View style={styles.missingHeaderCard}>
            <View style={styles.missingHeaderTitleRow}>
              <MaterialDesignIcons
                name="table-alert"
                size={21}
                color={Colors.danger}
              />

              <Text
                style={styles.missingHeaderTitle}>
                Missing Excel columns
              </Text>
            </View>

            {missingHeaders.map(header => (
              <View
                key={header}
                style={styles.missingHeaderRow}>
                <MaterialDesignIcons
                  name="close-circle-outline"
                  size={16}
                  color={Colors.danger}
                />

                <Text
                  style={styles.missingHeaderText}>
                  {header}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {previewRows.length > 0 ? (
          <>
            <SectionHeader
              number="3"
              title="Review Excel data"
              description="Check valid and invalid records before submission."
            />

            <View style={styles.summaryGrid}>
              <SummaryCard
                label="Total rows"
                value={previewRows.length}
                icon="table-row"
                iconColor={Colors.info}
                background={Colors.infoLight}
              />

              <SummaryCard
                label="Valid"
                value={validRows.length}
                icon="check-circle-outline"
                iconColor={Colors.success}
                background={Colors.successLight}
              />

              <SummaryCard
                label="Invalid"
                value={invalidRows.length}
                icon="alert-circle-outline"
                iconColor={Colors.danger}
                background={Colors.dangerLight}
              />
            </View>

            {invalidRows.length > 0 ? (
              <View style={styles.validationWarning}>
                <MaterialDesignIcons
                  name="alert-outline"
                  size={21}
                  color={Colors.warning}
                />

                <Text
                  style={styles.validationWarningText}>
                  Correct the invalid rows in the Excel
                  file and upload it again before
                  submitting.
                </Text>
              </View>
            ) : (
              <View style={styles.validationSuccess}>
                <MaterialDesignIcons
                  name="check-decagram-outline"
                  size={21}
                  color={Colors.success}
                />

                <Text
                  style={styles.validationSuccessText}>
                  All Excel rows are valid and ready to
                  submit.
                </Text>
              </View>
            )}

            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>
                  Row preview
                </Text>

                <Text style={styles.previewCount}>
                  Showing{' '}
                  {Math.min(
                    previewRows.length,
                    25,
                  )}{' '}
                  of {previewRows.length}
                </Text>
              </View>

              {previewRows
                .slice(0, 25)
                .map(row => (
                  <VoucherPreviewRow
                    key={row.rowNumber}
                    row={row}
                    showBeneficiaryCode={
                      categoryType === 'SALARY'
                    }
                  />
                ))}

              {previewRows.length > 25 ? (
                <View style={styles.moreRows}>
                  <Text style={styles.moreRowsText}>
                    + {previewRows.length - 25} more
                    rows
                  </Text>
                </View>
              ) : null}
            </View>
          </>
        ) : null}

        {submitError ? (
          <ErrorCard message={submitError} />
        ) : null}

        {uploadResponse ? (
  <View style={styles.resultCard}>
    <View
      style={[
        styles.resultIcon,
        {
          backgroundColor:
            isCompleteUploadFailure
              ? Colors.dangerLight
              : isPartialUpload
                ? Colors.warningLight
                : Colors.successLight,
        },
      ]}>
      <MaterialDesignIcons
        name={uploadResultIcon}
        size={30}
        color={uploadResultColor}
      />
    </View>

    <Text style={styles.resultTitle}>
      {uploadResultTitle}
    </Text>

    <Text style={styles.resultMessage}>
      {normalizedUploadResponse?.message ||
        'The bulk voucher request was processed.'}
    </Text>

    {isPartialUpload ? (
      <View style={styles.partialResultNotice}>
        <MaterialDesignIcons
          name="information-outline"
          size={18}
          color={Colors.warning}
        />

        <Text style={styles.partialResultNoticeText}>
          {successfulApiRows} voucher
          {successfulApiRows === 1
            ? ''
            : 's'}{' '}
          created successfully and{' '}
          {failedApiRows} row
          {failedApiRows === 1
            ? ''
            : 's'}{' '}
          failed.
        </Text>
      </View>
    ) : null}

    <View style={styles.resultStats}>
      <ResultStat
        label="Total"
        value={totalApiRows}
      />

      <ResultStat
        label="Successful"
        value={successfulApiRows}
      />

      <ResultStat
        label="Failed"
        value={failedApiRows}
      />
    </View>

    {apiFailedData.length > 0 ? (
      <View style={styles.failedRowsSection}>
        <View style={styles.failedRowsHeader}>
          <View style={styles.failedRowsTitleArea}>
            <MaterialDesignIcons
              name="alert-circle-outline"
              size={20}
              color={Colors.danger}
            />

            <Text style={styles.failedRowsTitle}>
              Failed rows
            </Text>
          </View>

          <View style={styles.failedCountBadge}>
            <Text style={styles.failedCountBadgeText}>
              {apiFailedData.length}
            </Text>
          </View>
        </View>

        <Text style={styles.failedRowsSubtitle}>
          Correct these rows in the Excel file and
          upload them again.
        </Text>

        <View style={styles.failedRowsList}>
          {visibleFailedRows.map(
            (failedRow, index) => (
              <View
                key={`${failedRow.row}-${index}`}
                style={styles.failedRowCard}>
                <View
                  style={
                    styles.failedRowNumber
                  }>
                  <Text
                    style={
                      styles.failedRowNumberText
                    }>
                    {failedRow.row > 0
                      ? failedRow.row
                      : index + 1}
                  </Text>
                </View>

                <View
                  style={
                    styles.failedRowContent
                  }>
                  <Text
                    style={
                      styles.failedRowLabel
                    }>
                    Row{' '}
                    {failedRow.row > 0
                      ? failedRow.row
                      : index + 1}
                  </Text>

                  <Text
                    style={
                      styles.failedRowError
                    }>
                    {failedRow.error}
                  </Text>
                </View>
              </View>
            ),
          )}
        </View>

        {apiFailedData.length > 10 ? (
          <Pressable
            onPress={() =>
              setShowAllFailedRows(
                currentValue =>
                  !currentValue,
              )
            }
            style={({pressed}) => [
              styles.showFailedRowsButton,

              pressed &&
                styles.pressed,
            ]}>
            <Text
              style={
                styles.showFailedRowsButtonText
              }>
              {showAllFailedRows
                ? 'Show fewer errors'
                : `Show all ${apiFailedData.length} errors`}
            </Text>

            <MaterialDesignIcons
              name={
                showAllFailedRows
                  ? 'chevron-up'
                  : 'chevron-down'
              }
              size={19}
              color={Colors.primary}
            />
          </Pressable>
        ) : null}

        {!showAllFailedRows &&
        remainingFailedRows > 0 ? (
          <Text
            style={
              styles.remainingFailedText
            }>
            + {remainingFailedRows} more failed
            row
            {remainingFailedRows === 1
              ? ''
              : 's'}
          </Text>
        ) : null}
      </View>
    ) : null}

    <View style={styles.resultActions}>
      <Pressable
        style={styles.secondaryButton}
        onPress={() => {
          setShowAllFailedRows(false);
          clearUploadResponse();
          resetCreateVoucher();
        }}>
        <Text
          style={
            styles.secondaryButtonText
          }>
          Create another
        </Text>
      </Pressable>

      <Pressable
        style={styles.primarySmallButton}
        onPress={() =>
          navigation.goBack()
        }>
        <Text
          style={
            styles.primarySmallButtonText
          }>
          View vouchers
        </Text>
      </Pressable>
    </View>
  </View>
) : null}

        {!uploadResponse ? (
          <Pressable
            style={({pressed}) => [
              styles.submitButton,
              !canSubmit &&
                styles.submitButtonDisabled,
              pressed &&
                canSubmit &&
                styles.pressed,
            ]}
            disabled={!canSubmit}
            onPress={handleSubmit}>
            {isSubmitting ? (
              <>
                <ActivityIndicator
                  size="small"
                  color={Colors.white}
                />

                <Text
                  style={styles.submitButtonText}>
                  Creating vouchers...
                </Text>
              </>
            ) : (
              <>
                <MaterialDesignIcons
                  name="file-check-outline"
                  size={22}
                  color={Colors.white}
                />

                <Text
                  style={styles.submitButtonText}>
                  Create{' '}
                  {validRows.length > 0
                    ? validRows.length
                    : ''}{' '}
                  Payment Voucher
                  {validRows.length === 1
                    ? ''
                    : 's'}
                </Text>
              </>
            )}
          </Pressable>
        ) : null}
      </ScrollView>

      <Modal
        visible={isCategoryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setIsCategoryModalVisible(false)
        }>
        <View style={styles.modalContainer}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() =>
              setIsCategoryModalVisible(false)
            }
          />

          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  Select expense category
                </Text>

                <Text style={styles.modalSubtitle}>
                  Choose a category for the payment
                  voucher
                </Text>
              </View>

              <Pressable
                style={styles.modalClose}
                onPress={() =>
                  setIsCategoryModalVisible(false)
                }>
                <MaterialDesignIcons
                  name="close"
                  size={22}
                  color={Colors.textPrimary}
                />
              </Pressable>
            </View>

            {isCategoryLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator
                  size="large"
                  color={Colors.primary}
                />

                <Text style={styles.modalLoadingText}>
                  Loading categories...
                </Text>
              </View>
            ) : (
              <FlatList
                data={categories}
                keyExtractor={item =>
                  String(item.id)
                }
                showsVerticalScrollIndicator={
                  false
                }
                contentContainerStyle={
                  styles.categoryModalList
                }
                renderItem={({item}) => {
                  const isSelected =
                    selectedCategoryId === item.id;

                  return (
                    <Pressable
                      onPress={() =>
                        handleCategorySelect(
                          item,
                        )
                      }
                      style={({pressed}) => [
                        styles.categoryModalItem,
                        isSelected &&
                          styles.categoryModalItemSelected,
                        pressed && styles.pressed,
                      ]}>
                      <View
                        style={[
                          styles.categoryModalIcon,
                          isSelected &&
                            styles.categoryModalIconSelected,
                        ]}>
                        <MaterialDesignIcons
                          name="folder-outline"
                          size={22}
                          color={
                            isSelected
                              ? Colors.white
                              : Colors.primary
                          }
                        />
                      </View>

                      <View
                        style={
                          styles.categoryModalContent
                        }>
                        <Text
                          style={[
                            styles.categoryModalName,
                            isSelected &&
                              styles.categoryModalNameSelected,
                          ]}>
                          {item.category_name}
                        </Text>

                        <Text
                          style={[
                            styles.categoryModalType,
                            isSelected &&
                              styles.categoryModalTypeSelected,
                          ]}>
                          {item.category_name
                            .trim()
                            .toUpperCase() ===
                          'SALARY'
                            ? 'Salary Excel format'
                            : 'Standard Excel format'}
                        </Text>
                      </View>

                      {isSelected ? (
                        <MaterialDesignIcons
                          name="check-circle"
                          size={22}
                          color={Colors.white}
                        />
                      ) : (
                        <MaterialDesignIcons
                          name="chevron-right"
                          size={22}
                          color={Colors.textMuted}
                        />
                      )}
                    </Pressable>
                  );
                }}
                ListEmptyComponent={
                  <View
                    style={styles.modalLoading}>
                    <MaterialDesignIcons
                      name="folder-alert-outline"
                      size={42}
                      color={Colors.textMuted}
                    />

                    <Text
                      style={
                        styles.modalLoadingText
                      }>
                      No expense categories found
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SectionHeader({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>
          {number}
        </Text>
      </View>

      <View style={styles.sectionHeaderContent}>
        <Text style={styles.sectionTitle}>
          {title}
        </Text>

        <Text style={styles.sectionDescription}>
          {description}
        </Text>
      </View>
    </View>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  iconColor,
  background,
}: {
  label: string;
  value: number;
  icon: React.ComponentProps<
    typeof MaterialDesignIcons
  >['name'];
  iconColor: string;
  background: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <View
        style={[
          styles.summaryIcon,
          {
            backgroundColor: background,
          },
        ]}>
        <MaterialDesignIcons
          name={icon}
          size={21}
          color={iconColor}
        />
      </View>

      <Text style={styles.summaryValue}>
        {value}
      </Text>

      <Text style={styles.summaryLabel}>
        {label}
      </Text>
    </View>
  );
}

function VoucherPreviewRow({
  row,
  showBeneficiaryCode,
}: {
  row: ExcelVoucherRow;
  showBeneficiaryCode: boolean;
}) {
  return (
    <View
      style={[
        styles.previewRow,
        !row.isValid &&
          styles.previewRowInvalid,
      ]}>
      <View style={styles.rowNumber}>
        <Text style={styles.rowNumberText}>
          {row.rowNumber}
        </Text>
      </View>

      <View style={styles.previewRowContent}>
        <View style={styles.previewRowTop}>
          <Text
            style={styles.previewBeneficiary}
            numberOfLines={1}>
            {row.beneficiaryName ||
              'Beneficiary unavailable'}
          </Text>

          <Text style={styles.previewAmount}>
            {formatCurrency(row.amount)}
          </Text>
        </View>

        {showBeneficiaryCode ? (
          <Text style={styles.previewMeta}>
            Code:{' '}
            {row.beneficiaryCode ||
              'Not provided'}
          </Text>
        ) : null}

        <Text
          style={styles.previewNarration}
          numberOfLines={2}>
          {row.narration ||
            'Narration not provided'}
        </Text>

        {!row.isValid ? (
          <View style={styles.rowErrorContainer}>
            {row.errors.map(error => (
              <View
                key={error}
                style={styles.rowError}>
                <MaterialDesignIcons
                  name="alert-circle-outline"
                  size={14}
                  color={Colors.danger}
                />

                <Text style={styles.rowErrorText}>
                  {error}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.validRowBadge}>
            <MaterialDesignIcons
              name="check-circle-outline"
              size={14}
              color={Colors.success}
            />

            <Text
              style={styles.validRowBadgeText}>
              Valid
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function ErrorCard({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.errorCard}>
      <MaterialDesignIcons
        name="alert-circle-outline"
        size={20}
        color={Colors.danger}
      />

      <Text style={styles.errorText}>
        {message}
      </Text>

      {actionLabel && onAction ? (
        <Pressable onPress={onAction}>
          <Text style={styles.errorAction}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ResultStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <View style={styles.resultStat}>
      <Text style={styles.resultStatValue}>
        {value}
      </Text>

      <Text style={styles.resultStatLabel}>
        {label}
      </Text>
    </View>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function formatFileSize(
  bytes?: number | null,
) {
  if (!bytes) {
    return 'Excel file';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  container: {
    flex: 1,
  },

  contentContainer: {
    padding: 16,
    paddingBottom: 42,
  },

  pressed: {
    opacity: 0.82,
  },

  introCard: {
    padding: 17,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
  },

  introIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },

  introContent: {
    flex: 1,
    marginLeft: 14,
  },

  introTitle: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },

  introDescription: {
    marginTop: 5,
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },

  sectionHeader: {
    marginTop: 25,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },

  stepNumberText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '800',
  },

  sectionHeaderContent: {
    flex: 1,
    marginLeft: 11,
  },

  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },

  sectionDescription: {
    marginTop: 3,
    color: Colors.textMuted,
    fontSize: 10,
    lineHeight: 15,
  },

  selector: {
    minHeight: 62,
    paddingHorizontal: 14,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
  },

  selectorIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },

  selectorContent: {
    flex: 1,
    marginLeft: 12,
  },

  selectorLabel: {
    color: Colors.textMuted,
    fontSize: 10,
  },

  selectorValue: {
    marginTop: 4,
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },

  placeholderText: {
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  templateCard: {
    marginTop: 13,
    padding: 15,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },

  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  templateIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.infoLight,
  },

  templateHeaderContent: {
    flex: 1,
    marginLeft: 11,
  },

  templateTitle: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },

  templateSubtitle: {
    marginTop: 3,
    color: Colors.textMuted,
    fontSize: 10,
  },

  headerList: {
    marginTop: 14,
    rowGap: 8,
  },

  headerItem: {
    minHeight: 39,
    paddingHorizontal: 10,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
  },

  headerIndex: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },

  headerIndexText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },

  headerName: {
    marginLeft: 9,
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },

  templateNote: {
    marginTop: 13,
    padding: 11,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.warningLight,
  },

  templateNoteText: {
    flex: 1,
    marginLeft: 8,
    color: Colors.warning,
    fontSize: 10,
    lineHeight: 15,
  },

  uploadBox: {
    minHeight: 205,
    padding: 22,
    borderRadius: 19,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },

  disabledUploadBox: {
    opacity: 0.48,
  },

  uploadIcon: {
    width: 70,
    height: 70,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },

  uploadTitle: {
    marginTop: 15,
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },

  uploadSubtitle: {
    marginTop: 6,
    maxWidth: 270,
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },

  fileTypeBadge: {
    marginTop: 13,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },

  fileTypeText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },

  selectedFileCard: {
    minHeight: 72,
    padding: 13,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: Colors.success,
    backgroundColor: Colors.successLight,
    flexDirection: 'row',
    alignItems: 'center',
  },

  fileIcon: {
    width: 47,
    height: 47,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },

  fileContent: {
    flex: 1,
    marginLeft: 11,
  },

  fileName: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },

  fileMeta: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 10,
  },

  errorCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 13,
    backgroundColor: Colors.dangerLight,
    flexDirection: 'row',
    alignItems: 'center',
  },

  errorText: {
    flex: 1,
    marginLeft: 8,
    color: Colors.danger,
    fontSize: 11,
    lineHeight: 16,
  },

  errorAction: {
    marginLeft: 8,
    color: Colors.danger,
    fontSize: 11,
    fontWeight: '800',
  },

  missingHeaderCard: {
    marginTop: 12,
    padding: 14,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerLight,
  },

  missingHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  missingHeaderTitle: {
    marginLeft: 8,
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },

  missingHeaderRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },

  missingHeaderText: {
    marginLeft: 7,
    color: Colors.danger,
    fontSize: 11,
  },

  summaryGrid: {
    flexDirection: 'row',
    columnGap: 9,
  },

  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },

  summaryIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryValue: {
    marginTop: 10,
    color: Colors.textPrimary,
    fontSize: 19,
    fontWeight: '800',
  },

  summaryLabel: {
    marginTop: 2,
    color: Colors.textSecondary,
    fontSize: 10,
  },

  validationWarning: {
    marginTop: 12,
    padding: 12,
    borderRadius: 13,
    backgroundColor: Colors.warningLight,
    flexDirection: 'row',
    alignItems: 'center',
  },

  validationWarningText: {
    flex: 1,
    marginLeft: 8,
    color: Colors.warning,
    fontSize: 11,
    lineHeight: 16,
  },

  validationSuccess: {
    marginTop: 12,
    padding: 12,
    borderRadius: 13,
    backgroundColor: Colors.successLight,
    flexDirection: 'row',
    alignItems: 'center',
  },

  validationSuccessText: {
    flex: 1,
    marginLeft: 8,
    color: Colors.success,
    fontSize: 11,
    lineHeight: 16,
  },

  previewCard: {
    marginTop: 13,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },

  previewHeader: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  previewTitle: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },

  previewCount: {
    color: Colors.textMuted,
    fontSize: 9,
  },

  previewRow: {
    padding: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
  },

  previewRowInvalid: {
    backgroundColor: Colors.dangerLight,
  },

  rowNumber: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceSecondary,
  },

  rowNumberText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },

  previewRowContent: {
    flex: 1,
    marginLeft: 11,
  },

  previewRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  previewBeneficiary: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },

  previewAmount: {
    marginLeft: 9,
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },

  previewMeta: {
    marginTop: 4,
    color: Colors.textMuted,
    fontSize: 9,
  },

  previewNarration: {
    marginTop: 5,
    color: Colors.textSecondary,
    fontSize: 10,
    lineHeight: 15,
  },

  rowErrorContainer: {
    marginTop: 7,
    rowGap: 4,
  },

  rowError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  rowErrorText: {
    flex: 1,
    marginLeft: 5,
    color: Colors.danger,
    fontSize: 9,
    lineHeight: 13,
  },

  validRowBadge: {
    alignSelf: 'flex-start',
    marginTop: 7,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successLight,
  },

  validRowBadgeText: {
    marginLeft: 4,
    color: Colors.success,
    fontSize: 9,
    fontWeight: '700',
  },

  moreRows: {
    padding: 12,
    alignItems: 'center',
  },

  moreRowsText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },

  submitButton: {
    minHeight: 56,
    marginTop: 22,
    paddingHorizontal: 18,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 9,
    backgroundColor: Colors.primary,
  },

  submitButtonDisabled: {
    opacity: 0.45,
  },

  submitButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '800',
  },

  resultCard: {
    marginTop: 20,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },

  resultIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceSecondary,
  },

  resultTitle: {
    marginTop: 13,
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },

  resultMessage: {
    marginTop: 6,
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },

  resultStats: {
    width: '100%',
    marginTop: 17,
    flexDirection: 'row',
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceSecondary,
  },

  resultStat: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },

  resultStatValue: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },

  resultStatLabel: {
    marginTop: 3,
    color: Colors.textMuted,
    fontSize: 9,
  },

  resultActions: {
    width: '100%',
    marginTop: 17,
    flexDirection: 'row',
    columnGap: 10,
  },

  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },

  primarySmallButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },

  primarySmallButtonText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700',
  },

  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(16,24,40,0.48)',
  },

  modalSheet: {
    maxHeight: '78%',
    paddingTop: 10,
    paddingHorizontal: 17,
    paddingBottom: 24,
    borderTopLeftRadius: 27,
    borderTopRightRadius: 27,
    backgroundColor: Colors.surface,
  },

  modalHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    backgroundColor: Colors.border,
  },

  modalHeader: {
    paddingTop: 17,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  modalTitle: {
    color: Colors.textPrimary,
    fontSize: 19,
    fontWeight: '800',
  },

  modalSubtitle: {
    marginTop: 4,
    color: Colors.textMuted,
    fontSize: 10,
  },

  modalClose: {
    width: 40,
    height: 40,
    marginLeft: 'auto',
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceSecondary,
  },

  modalLoading: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalLoadingText: {
    marginTop: 10,
    color: Colors.textSecondary,
    fontSize: 12,
  },

  categoryModalList: {
    paddingBottom: 12,
    rowGap: 9,
  },

  categoryModalItem: {
    minHeight: 67,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSecondary,
    flexDirection: 'row',
    alignItems: 'center',
  },

  categoryModalItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },

  categoryModalIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },

  categoryModalIconSelected: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  categoryModalContent: {
    flex: 1,
    marginLeft: 11,
  },

  categoryModalName: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },

  categoryModalNameSelected: {
    color: Colors.white,
  },

  categoryModalType: {
    marginTop: 4,
    color: Colors.textMuted,
    fontSize: 9,
  },

  categoryModalTypeSelected: {
    color: 'rgba(255,255,255,0.76)',
  },

  templateButton: {
  minHeight: 50,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  paddingHorizontal: 15,
  marginTop: 12,
  marginBottom: 14,
  borderWidth: 1,
  borderColor: Colors.primary,
  borderRadius: 12,
  backgroundColor: '#F3FFF8',
},

templateButtonDisabled: {
  borderColor: '#D8DEE4',
  backgroundColor: '#F5F6F7',
},

templateButtonText: {
  flex: 1,
  fontSize: 14,
  fontWeight: '700',
  color: Colors.primary,
},

templateButtonTextDisabled: {
  color: Colors.textMuted,
  },

  partialResultNotice: {
  width: '100%',
  marginTop: 14,
  paddingHorizontal: 12,
  paddingVertical: 11,
  borderRadius: 12,
  flexDirection: 'row',
  alignItems: 'flex-start',
  columnGap: 8,
  backgroundColor: Colors.warningLight,
},

partialResultNoticeText: {
  flex: 1,
  color: Colors.warning,
  fontSize: 11,
  lineHeight: 16,
  fontWeight: '600',
},

failedRowsSection: {
  width: '100%',
  marginTop: 18,
  padding: 13,
  borderWidth: 1,
  borderColor: Colors.dangerLight,
  borderRadius: 15,
  backgroundColor: Colors.surfaceSecondary,
},

failedRowsHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},

failedRowsTitleArea: {
  flexDirection: 'row',
  alignItems: 'center',
  columnGap: 7,
},

failedRowsTitle: {
  color: Colors.textPrimary,
  fontSize: 14,
  fontWeight: '800',
},

failedCountBadge: {
  minWidth: 28,
  height: 28,
  paddingHorizontal: 7,
  borderRadius: 14,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: Colors.dangerLight,
},

failedCountBadgeText: {
  color: Colors.danger,
  fontSize: 11,
  fontWeight: '800',
},

failedRowsSubtitle: {
  marginTop: 7,
  color: Colors.textSecondary,
  fontSize: 10,
  lineHeight: 15,
},

failedRowsList: {
  marginTop: 12,
  rowGap: 8,
},

failedRowCard: {
  paddingHorizontal: 10,
  paddingVertical: 10,
  borderWidth: 1,
  borderColor: Colors.border,
  borderRadius: 11,
  flexDirection: 'row',
  alignItems: 'flex-start',
  columnGap: 9,
  backgroundColor: Colors.surface,
},

failedRowNumber: {
  minWidth: 29,
  height: 29,
  paddingHorizontal: 5,
  borderRadius: 9,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: Colors.dangerLight,
},

failedRowNumberText: {
  color: Colors.danger,
  fontSize: 10,
  fontWeight: '800',
},

failedRowContent: {
  flex: 1,
},

failedRowLabel: {
  color: Colors.textPrimary,
  fontSize: 11,
  fontWeight: '800',
},

failedRowError: {
  marginTop: 3,
  color: Colors.danger,
  fontSize: 10,
  lineHeight: 15,
},

showFailedRowsButton: {
  minHeight: 42,
  marginTop: 12,
  paddingHorizontal: 12,
  borderWidth: 1,
  borderColor: Colors.primary,
  borderRadius: 11,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  columnGap: 6,
  backgroundColor: Colors.primaryLight,
},

showFailedRowsButtonText: {
  color: Colors.primary,
  fontSize: 11,
  fontWeight: '700',
},

remainingFailedText: {
  marginTop: 8,
  color: Colors.textSecondary,
  fontSize: 10,
  textAlign: 'center',
},
});