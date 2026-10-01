import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const res = await api.get('/dashboard/metrics');
      return res.data;
    },
    staleTime: 60 * 1000, // 1 minute
  });
}
