import apiClient from "./client";

export interface TransactionItem {
  description: string;
  serialNumbers: string[];
  qty: number;
  unitPrice: number;
  amount: number;
}

export interface Transaction {
  _id: string;
  userId: string;
  customerId: string | null;
  customerName: string;
  date: string;
  billNo: string;
  items: TransactionItem[];
  cash: number;
  returnAmount: number;
  paymentType: "item" | "cash" | "upi" | "neft";
  upiRef: string;
  neftRef: string;
  remarks: string;
  runningBalance: number;
  createdAt: string;
}

export interface TransactionFilters {
  customer?: string;
  from?: string;
  to?: string;
  type?: string;
  search?: string;
}

export const transactionsApi = {
  list: (filters?: TransactionFilters) =>
    apiClient.get<Transaction[]>("/api/transactions", { params: filters }).then((r) => r.data),
  summary: () => apiClient.get("/api/transactions/summary").then((r) => r.data),
  create: (data: Partial<Transaction>) =>
    apiClient.post<Transaction>("/api/transactions", data).then((r) => r.data),
  createBulk: (transactions: Partial<Transaction>[]) =>
    apiClient.post<Transaction[]>("/api/transactions/bulk", { transactions }).then((r) => r.data),
  update: (id: string, data: Partial<Transaction>) =>
    apiClient.put<Transaction>(`/api/transactions/${id}`, data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/api/transactions/${id}`).then((r) => r.data),
};
