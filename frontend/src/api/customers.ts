import apiClient from "./client";

export interface Customer {
  _id: string;
  name: string;
  phone: string;
  aliases: string[];
  notes: string;
  createdAt: string;
}

export const customersApi = {
  list: () => apiClient.get<Customer[]>("/api/customers").then((r) => r.data),
  create: (data: Partial<Customer>) => apiClient.post<Customer>("/api/customers", data).then((r) => r.data),
  update: (id: string, data: Partial<Customer>) => apiClient.put<Customer>(`/api/customers/${id}`, data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/api/customers/${id}`).then((r) => r.data),
};
