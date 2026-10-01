import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

interface LeadParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export function useLeads(params: LeadParams = {}) {
  const { page = 1, limit = 20, search = '', status = '' } = params;

  return useQuery({
    queryKey: ['leads', page, limit, search, status],
    queryFn: async () => {
      const query = new URLSearchParams();
      query.set('page', String(page));
      query.set('limit', String(limit));
      if (search) query.set('search', search);
      if (status) query.set('status', status);
      const res = await api.get(`/leads?${query.toString()}`);
      return res.data;
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/leads/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/leads/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/leads', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });
}
