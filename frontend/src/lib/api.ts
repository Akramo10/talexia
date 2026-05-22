const envApiBase = import.meta.env.VITE_API_BASE_URL;

const browserApiBase =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:8000/api/v1`
    : '/api/v1';

export const API_BASE = envApiBase && envApiBase !== 'auto' ? envApiBase : browserApiBase;
