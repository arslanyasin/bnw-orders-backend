export interface ImportResult {
  totalRows: number;
  successCount: number;
  failedCount: number;
  successRecords: any[];
  failedRecords: FailedRecord[];
}

export interface FailedRecord {
  row: number;
  data: any;
  errors: string[];
}

export interface ExcelRowData {
  CNIC: string;
  CUSTOMER_NAME: string;
  MOBILE1: string;
  MOBILE2?: string;
  PHONE1?: string;
  PHONE2?: string;
  ADDRESS: string;
  CITY: string;
  BRAND: string;
  PRODUCT: string;
  GIFTCODE: string;
  Qty: number;
  'Ref No.': string;
  'PO #': string;
  'ORDER DATE': string | Date;
  'Redeemed Points': number;
}
