export interface ExcelRowData {
  EFORMS?: any;
  CNIC?: any;
  CUSTOMER_NAME?: any;
  MOBILE1?: any;
  authorized_receiver?: any;
  receiver_cnic?: any;
  ADDRESS?: any;
  CITY?: any;
  PRODUCT?: any;
  GIFTCODE?: any;
  Qty?: any;
  'PO #'?: any;
  'ORDER DATE'?: any;
  AMOUNT?: any;
  COLOR?: any;
}

export interface FailedRecord {
  row: number;
  data: ExcelRowData;
  errors: string[];
}

export interface SuccessRecord {
  row: number;
  id: string;
  eforms: string;
  customerName: string;
}

export interface ImportResult {
  totalRows: number;
  successCount: number;
  failedCount: number;
  successRecords: SuccessRecord[];
  failedRecords: FailedRecord[];
}
