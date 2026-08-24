export type CatalogImportStatus =
    | 'UPLOADED'
    | 'VALIDATING'
    | 'READY'
    | 'PROCESSING'
    | 'COMPLETED'
    | 'FAILED'
    | 'CANCELLED';

export type CatalogImportMode = 'FULL' | 'PRICE' | 'STOCK';

export type CatalogImportChangeDto = {
    sku: string;
    currentPrice?: number;
    newPrice?: number;
    currentCurrency?: string;
    newCurrency?: string;
    currentStockQty?: number;
    newStockQty?: number;
    stockDifference?: number;
};

export type CatalogImportErrorDto = {
    id?: number;
    sheet: string;
    rowNumber: number;
    sku: string | null;
    field: string | null;
    sourceValue: string | null;
    message: string;
};

export type CatalogImportDto = {
    id: number;
    fileName: string;
    fileSize: number;
    fileHash: string;
    mode: CatalogImportMode;
    status: CatalogImportStatus;
    totalRows: number;
    createdCount: number;
    updatedCount: number;
    unchangedCount: number;
    errorCount: number;
    duplicateOfId: number | null;
    errorMessage: string | null;
    startedAt: string | null;
    completedAt: string | null;
    createdAt: string;
    uploadedBy: { firstName: string; lastName: string; email: string };
    errors?: CatalogImportErrorDto[];
    changes?: CatalogImportChangeDto[];
    warnings?: CatalogImportErrorDto[];
};
