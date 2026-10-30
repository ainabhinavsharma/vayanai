import { upsertInternApplicationFromSheet, listAllInternApplications } from '@/lib/db/intern-repo';
import { dispatchApplicationReceivedEmail } from '@/lib/services/email-dispatcher';
import { InternApplication } from '@/types/auth';

export const DEFAULT_GOOGLE_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1koeFclx1MsMM_cQXk3hrU-JTLXlj3OGrDegQIG9-Zio/export?format=csv&gid=1670509518';

/**
 * Normalizes any user-provided Google Sheet URL (including raw edit / web links)
 * into a direct CSV export download endpoint.
 */
export function normalizeGoogleSheetCsvUrl(rawUrl?: string): string {
  const url = (rawUrl || process.env.GOOGLE_SHEET_CSV_URL || DEFAULT_GOOGLE_SHEET_URL).trim();
  if (!url) return DEFAULT_GOOGLE_SHEET_URL;
  if (url.includes('/export?format=csv') || url.includes('/pub?output=csv')) {
    return url;
  }
  const docMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!docMatch) return url;
  const docId = docMatch[1];
  const gidMatch = url.match(/gid=([0-9]+)/);
  const gid = gidMatch ? gidMatch[1] : '0';
  return `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&gid=${gid}`;
}

export interface SyncResult {
  success: boolean;
  totalFetched: number;
  newInserted: number;
  updatedExisting: number;
  dueForInviteCount: number;
  candidates: InternApplication[];
  error?: string;
}

export function parseCSV(csvText: string): Record<string, string>[] {
  const lines: string[] = [];
  let currentLine = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    if (char === '"') {
      insideQuotes = !insideQuotes;
      currentLine += char;
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && csvText[i + 1] === '\n') {
        i++;
      }
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = '';
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  if (lines.length < 2) return [];

  function splitLine(line: string): string[] {
    const fields: string[] = [];
    let field = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      if (c === '"') {
        if (inQuotes && line[j + 1] === '"') {
          field += '"';
          j++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        fields.push(field.trim());
        field = '';
      } else {
        field += c;
      }
    }
    fields.push(field.trim());
    return fields;
  }

  const rawHeaders = splitLine(lines[0]);
  const headers = rawHeaders.map((h) => h.replace(/^["']|["']$/g, '').trim());

  const records: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = splitLine(lines[i]);
    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      let val = values[idx] || '';
      val = val.replace(/^["']|["']$/g, '').trim();
      record[header] = val;
    });
    records.push(record);
  }

  return records;
}

export function parseTimestampToISO(raw: string): string {
  if (!raw) return new Date().toISOString();
  // Formats like "10/24/2026 0:25:37" or standard ISO
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    return d.toISOString();
  }

  // Fallback regex for M/D/YYYY H:M:S
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (match) {
    const [, month, day, year, hour, minute, second] = match;
    const constructed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second || 0)
    );
    if (!isNaN(constructed.getTime())) {
      return constructed.toISOString();
    }
  }

  return new Date().toISOString();
}

export async function fetchAndSyncGoogleSheet(
  sheetUrl?: string,
  fallbackCsv?: string
): Promise<SyncResult> {
  const targetUrl = normalizeGoogleSheetCsvUrl(sheetUrl);
  let csvData = fallbackCsv || '';

  if (!csvData) {
    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) VayanaiSync/1.0',
          Accept: 'text/csv,text/plain,*/*'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`Google Sheet fetch returned status ${response.status}: ${response.statusText}`);
      }

      csvData = await response.text();
    } catch (err: any) {
      return {
        success: false,
        totalFetched: 0,
        newInserted: 0,
        updatedExisting: 0,
        dueForInviteCount: 0,
        candidates: listAllInternApplications(),
        error: `Failed to fetch Google Sheet: ${err.message}`
      };
    }
  }

  const rows = parseCSV(csvData);
  let newInserted = 0;
  let updatedExisting = 0;

  for (const row of rows) {
    const email = (row['Email Address'] || row['email'] || '').trim();
    const name = (row['Name'] || row['Full Name'] || row['name'] || '').trim();
    if (!email || !name) continue;

    const track = (row['Select Internship'] || row['Track'] || row['track'] || 'Sustainable Regional Operations & Growth').trim();
    const college = (row['College Name'] || row['college'] || '').trim();
    const semester = (row['Semester'] || row['semester'] || '').trim();
    const phone = (row['WhatsApp number '] || row['WhatsApp number'] || row['Phone'] || row['phone'] || '').trim();
    const cvUrl = (row['Please Upload Your CV'] || row['CV'] || row['Resume'] || '').trim();
    const available3 = (row['Are you available for next 3 months for Internship?'] || 'Yes').trim();
    const laptop = (row['Do you Laptop and Internet Connection ?'] || 'Yes').trim();
    const placement = (row['Do u require job placement after completion of Internship?'] || 'No').trim();
    const source = (row['How did you hear about us'] || 'Direct').trim();
    const rawTimestamp = row['Timestamp'] || '';

    const appliedAt = parseTimestampToISO(rawTimestamp);

    const result = upsertInternApplicationFromSheet({
      userName: name,
      userEmail: email,
      phone,
      collegeName: college,
      semester,
      trackName: track,
      cvUrl,
      available3Months: available3,
      laptopInternet: laptop,
      placementNeeded: placement,
      sourceReferral: source,
      appliedAt
    });

    if (result.isNew) {
      newInserted++;
      try {
        await dispatchApplicationReceivedEmail(result.application.id);
      } catch (err: any) {
        console.warn(`[Sync Mail Notice] Could not dispatch welcome to ${email}:`, err.message);
      }
    } else {
      updatedExisting++;
    }
  }

  const all = listAllInternApplications();
  const now = Date.now();
  const dueForInviteCount = all.filter(
    (c) => c.status === 'applied' && c.inviteScheduledAt && new Date(c.inviteScheduledAt).getTime() <= now
  ).length;

  return {
    success: true,
    totalFetched: rows.length,
    newInserted,
    updatedExisting,
    dueForInviteCount,
    candidates: all
  };
}
