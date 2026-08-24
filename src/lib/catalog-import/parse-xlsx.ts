import ExcelJS from 'exceljs';
import { catalogImportConfig, catalogImportSheets } from '@/config/catalogImport';
import type { CatalogImportErrorDto } from '@/types/catalog-import';

type SheetName = keyof typeof catalogImportSheets;
export type ParsedCatalogRow = { rowNumber: number; values: Record<string, unknown> };
export type ParsedCatalogWorkbook = Record<SheetName, ParsedCatalogRow[]>;

export async function parseCatalogWorkbook(buffer: Buffer) {
    if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
        throw new Error('Файл не является корректным XLSX-архивом.');
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const errors: CatalogImportErrorDto[] = [];
    const parsed = {} as ParsedCatalogWorkbook;
    let totalRows = 0;

    for (const [sheetName, expectedHeaders] of Object.entries(catalogImportSheets) as Array<[SheetName, readonly string[]]>) {
        const sheet = workbook.getWorksheet(sheetName);
        if (!sheet) {
            errors.push(issue(sheetName, 1, null, null, null, `Обязательный лист «${sheetName}» отсутствует.`));
            parsed[sheetName] = [];
            continue;
        }

        const actualHeaders = readHeaders(sheet.getRow(1));
        const duplicateHeaders = actualHeaders.filter((header, index) => header && actualHeaders.indexOf(header) !== index);
        for (const header of new Set(duplicateHeaders)) {
            errors.push(issue(sheetName, 1, null, header, header, `Заголовок «${header}» указан несколько раз.`));
        }
        for (const header of expectedHeaders) {
            if (!actualHeaders.includes(header)) errors.push(issue(sheetName, 1, null, header, null, `Отсутствует обязательная колонка «${header}».`));
        }
        for (const header of actualHeaders) {
            if (header && !expectedHeaders.includes(header)) errors.push(issue(sheetName, 1, null, header, header, `Неизвестная колонка «${header}».`));
        }

        const rows: ParsedCatalogRow[] = [];
        sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber === 1) return;
            const values: Record<string, unknown> = {};
            let hasValue = false;
            expectedHeaders.forEach((header, index) => {
                const value = unwrapCellValue(row.getCell(index + 1).value);
                values[header] = value;
                if (value !== null && value !== '') hasValue = true;
            });
            if (hasValue) rows.push({ rowNumber, values });
        });
        totalRows += rows.length;
        parsed[sheetName] = rows;
    }

    if (totalRows > catalogImportConfig.maxRows) {
        errors.push(issue('Products', 1, null, null, String(totalRows), `В файле больше ${catalogImportConfig.maxRows} строк.`));
    }

    return { workbook: parsed, errors, totalRows };
}

function readHeaders(row: ExcelJS.Row) {
    const headers: string[] = [];
    for (let column = 1; column <= row.cellCount; column += 1) {
        headers.push(String(unwrapCellValue(row.getCell(column).value) ?? '').trim().toLowerCase());
    }
    return headers;
}

function unwrapCellValue(value: ExcelJS.CellValue): unknown {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) return value;
    if (typeof value !== 'object') return typeof value === 'string' ? value.trim() : value;
    if ('result' in value) return unwrapCellValue(value.result as ExcelJS.CellValue);
    if ('error' in value) return null;
    if ('hyperlink' in value) return value.hyperlink;
    if ('text' in value) return String(value.text).trim();
    if ('richText' in value) return value.richText.map((part) => part.text).join('').trim();
    return String(value).trim();
}

export function issue(sheet: string, rowNumber: number, sku: string | null, field: string | null, sourceValue: unknown, message: string): CatalogImportErrorDto {
    return { sheet, rowNumber, sku, field, sourceValue: sourceValue == null ? null : String(sourceValue).slice(0, 4000), message };
}
