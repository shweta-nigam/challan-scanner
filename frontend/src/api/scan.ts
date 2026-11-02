import apiClient from "./client";

export interface PendingEntry {
  _id: string;
  extractedData: {
    customerName: string;
    customerPhone: string;
    date: string;
    billNo: string;
    paymentType: string;
    items: Array<{
      description: string;
      serialNumbers: string[];
      qty: number;
      unitPrice: number;
      amount: number;
    }>;
    cash: number;
    returnAmount: number;
    upiRef: string;
    neftRef: string;
    remarks: string;
  };
  matchedCustomerId: string | null;
  matchedCustomerName: string;
  matchConfidence: "high" | "medium" | "low" | "none";
  matchMethod: string;
  status: "pending" | "confirmed" | "rejected";
  imageUrl: string;
  originalFilename: string;
  createdAt: string;
}

export const pendingApi = {
  list: () => apiClient.get<PendingEntry[]>("/api/pending").then((r) => r.data),
  confirm: (id: string, data: Record<string, unknown>) =>
    apiClient.put(`/api/pending/${id}/confirm`, data).then((r) => r.data),
  reject: (id: string) => apiClient.put(`/api/pending/${id}/reject`).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    apiClient.put(`/api/pending/${id}`, data).then((r) => r.data),
};

export interface ScanResult {
  pendingEntryId: string;
  extractedData: PendingEntry["extractedData"];
  matchedCustomer: { _id: string; name: string; phone: string } | null;
  matchConfidence: string;
  matchMethod: string;
  imageUrl: string;
  error?: string;
  filename?: string;
}

export const scanApi = {
  scan: (files: File[]) => {
    const form = new FormData();
    files.forEach((f) => form.append("challans", f));
    return apiClient
      .post<{ results: ScanResult[] }>("/api/scan", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
};
