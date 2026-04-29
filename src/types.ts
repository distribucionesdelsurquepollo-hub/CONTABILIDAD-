export type UnitType = 'kg' | 'unidad';

export interface CompanyConfig {
  name: string;
  nit: string;
  phone1: string;
  phone2: string;
  address: string;
  warehouseAddress: string;
  email: string;
  manager: string;
  logoUrl?: string;
}

export interface Product {
  id: string;
  name: string;
  unitType: UnitType;
  stock: number;
  costPrice: number;
  salePrice: number;
  category: string;
  isInitial?: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
}

export interface TransactionItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  unitType: UnitType;
}

export interface Purchase {
  id: string;
  supplierId: string;
  supplierName: string;
  date: any; // Timestamp
  items: TransactionItem[];
  total: number;
  paymentType: 'contado' | 'credito';
  amountPaid: number;
  isDeboned?: boolean;
}

export interface Sale {
  id: string;
  customerId: string;
  customerName: string;
  date: any; // Timestamp
  items: TransactionItem[];
  total: number;
  paymentType: 'contado' | 'credito';
  amountPaid: number;
}

export interface DeboningLog {
  id: string;
  purchaseId: string;
  sourceQuantity: number; // kg of whole chicken
  outputItems: TransactionItem[];
  date: any;
}

export interface CashSession {
  id: string;
  date: string; // YYYY-MM-DD
  openingBalance: number;
  closingBalance?: number;
  status: 'open' | 'closed';
  startTime: any;
  endTime?: any;
  openedBy: string;
}

export interface CashMovement {
  id: string;
  type: 'in' | 'out';
  amount: number;
  reason: string;
  timestamp: any;
}

export interface Employee {
  id: string;
  name: string;
  salary: number;
  role: string;
}

export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  checkIn: any;
  checkOut?: any;
  isLate: boolean;
  isEarlyLeave: boolean;
  notes?: string;
  lunchStartTime?: any;
  lunchEndTime?: any;
}

export interface UserRole {
  uid: string;
  email: string;
  role: 'admin' | 'vendedor';
}
