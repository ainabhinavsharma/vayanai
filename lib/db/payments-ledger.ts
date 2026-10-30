import fs from 'fs';
import path from 'path';

export interface LedgerItem {
  applicationId: string;
  userName: string;
  userEmail: string;
  phone?: string;
  collegeName?: string;
  trackName: string;
  status: string;
  utrNumber: string;
  receiptNumber: string;
  depositPaidAt: string;
  signatureName?: string;
  offerAcceptedAt?: string;
  offerLetterId?: string;
  batchStartDate?: string;
  paymentId?: string;
  amountINR?: number;
  paymentStatus?: string;
  createdAt?: string;
}

export function getLedgerFilePath(): string {
  const dataDir = process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'payments_ledger.json');
}

export function readPaymentsLedger(): LedgerItem[] {
  try {
    const filePath = getLedgerFilePath();
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Failed to read payments ledger:', err);
    return [];
  }
}

export function saveToPaymentsLedger(item: LedgerItem): void {
  try {
    const filePath = getLedgerFilePath();
    const list = readPaymentsLedger();
    const cleanEmail = item.userEmail.trim().toLowerCase();

    const idx = list.findIndex(
      (x) =>
        x.userEmail.trim().toLowerCase() === cleanEmail ||
        (item.utrNumber && x.utrNumber === item.utrNumber)
    );

    if (idx >= 0) {
      list[idx] = { ...list[idx], ...item };
    } else {
      list.push(item);
    }

    fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save to payments ledger:', err);
  }
}
