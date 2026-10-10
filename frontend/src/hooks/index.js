import { useQuery } from '@tanstack/react-query';
import { fetchHealthCheck } from '../services/api.js';

export const useHealthCheck = () => {
  return useQuery({
    queryKey: ['health'],
    queryFn: fetchHealthCheck,
    retry: 1,
  });
};
