import ExcelJS from 'exceljs';
import { catalogImportSheets } from '@/config/catalogImport';

export async function createCatalogImportTemplate() {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Anneng Admin';
    for (const [sheetName, headers] of Object.entries(catalogImportSheets)) {
        const sheet = workbook.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });
        sheet.addRow([...headers]);
        const header = sheet.getRow(1);
        header.height = 30;
        header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF17365D' } };
        header.alignment = { vertical: 'middle', wrapText: true };
        headers.forEach((name, index) => { sheet.getColumn(index + 1).width = Math.min(32, Math.max(13, name.length + 2)); });
        if (sheetName === 'Products') {
            sheet.getColumn('A').numFmt = '@';
            sheet.getColumn('B').numFmt = '@';
            sheet.getColumn('C').numFmt = '0';
        } else sheet.getColumn('A').numFmt = '@';
        sheet.autoFilter = { from: 'A1', to: `${columnName(headers.length)}1` };
    }
    return Buffer.from(await workbook.xlsx.writeBuffer());
}

function columnName(index: number) {
    let value = index;
    let result = '';
    while (value > 0) { value -= 1; result = String.fromCharCode(65 + value % 26) + result; value = Math.floor(value / 26); }
    return result;
}
