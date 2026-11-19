// Export Excel propre : en-têtes en gras sur fond vert, colonnes à la bonne largeur, première ligne figée,
// filtres automatiques, dates au format français. La bibliothèque n'est chargée qu'au moment de l'export.
const GREEN = 'FF156C53';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Africa/Lome' });

export const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : dateFormatter.format(date);
};

const today = () => new Date().toISOString().slice(0, 10);

const cellText = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  return value;
};

/**
 * columns : [{ header, value: (row) => any, width? }]
 * Le fichier s'appelle hubinvest-<name>-<date>.xlsx.
 */
export async function exportToExcel({ name, sheetName, columns, rows }) {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HubInvest';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet((sheetName || name).slice(0, 31), { views: [{ state: 'frozen', ySplit: 1 }] });

  sheet.columns = columns.map((column) => ({ header: column.header, key: column.header, width: column.width || 18 }));
  rows.forEach((row) => {
    sheet.addRow(Object.fromEntries(columns.map((column) => [column.header, cellText(column.value(row))])));
  });

  const header = sheet.getRow(1);
  header.height = 22;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } };
    cell.alignment = { vertical: 'middle' };
  });
  sheet.eachRow((row, index) => {
    if (index === 1) return;
    row.alignment = { vertical: 'top', wrapText: true };
  });
  if (rows.length) sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `hubinvest-${name}-${today()}.xlsx`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
