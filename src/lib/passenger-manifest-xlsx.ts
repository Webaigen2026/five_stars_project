import ExcelJS from "exceljs";

import {
  PASSENGER_MANIFEST_COLUMNS,
  type ManifestExportRow,
} from "./passenger-manifest";

/**
 * Build an in-memory passenger manifest workbook.
 * Passport numbers are written as text to preserve leading zeros / alphanumeric IDs.
 */
export async function buildPassengerManifestWorkbook(
  rows: ManifestExportRow[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Five Stars";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Passenger Manifest", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = [
    { header: PASSENGER_MANIFEST_COLUMNS[0], key: "firstName", width: 16 },
    { header: PASSENGER_MANIFEST_COLUMNS[1], key: "lastName", width: 16 },
    { header: PASSENGER_MANIFEST_COLUMNS[2], key: "dateOfBirth", width: 14 },
    { header: PASSENGER_MANIFEST_COLUMNS[3], key: "gender", width: 10 },
    { header: PASSENGER_MANIFEST_COLUMNS[4], key: "nationality", width: 12 },
    {
      header: PASSENGER_MANIFEST_COLUMNS[5],
      key: "passportIssuingCountry",
      width: 22,
    },
    { header: PASSENGER_MANIFEST_COLUMNS[6], key: "passportNumber", width: 18 },
    {
      header: PASSENGER_MANIFEST_COLUMNS[7],
      key: "passportExpiration",
      width: 18,
    },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle" };

  for (const row of rows) {
    const excelRow = sheet.addRow({
      firstName: row.firstName,
      lastName: row.lastName,
      dateOfBirth: row.dateOfBirth,
      gender: row.gender,
      nationality: row.nationality,
      passportIssuingCountry: row.passportIssuingCountry,
      passportNumber: row.passportNumber,
      passportExpiration: row.passportExpiration,
    });

    // Force passport column to text so Excel does not coerce values.
    excelRow.getCell("passportNumber").numFmt = "@";
  }

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: PASSENGER_MANIFEST_COLUMNS.length },
  };

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

/** Test helper: read passport column values from a generated workbook buffer. */
export async function readManifestPassportColumn(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as never);

  const sheet = workbook.getWorksheet("Passenger Manifest");

  if (!sheet) {
    return [] as string[];
  }

  const values: string[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const cell = row.getCell(7);
    values.push(String(cell.text || cell.value || ""));
  });

  return values;
}
