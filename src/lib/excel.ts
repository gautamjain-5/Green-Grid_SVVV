/** Builds and downloads a real .xlsx workbook (one sheet per entry). Browser only. */
export async function downloadExcel(filename: string, sheets: Record<string, Record<string, unknown>[]>) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{ info: "No data" }]), name.slice(0, 31));
  }
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}
