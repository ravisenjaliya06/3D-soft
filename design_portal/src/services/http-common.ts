import { getTokenDetail } from '@/components/helper/helper';
import axios from 'axios';

const http = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_PUBLIC_API}/${process.env.NEXT_PUBLIC_APP_VERSION}/`,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// Dynamically set the token for every request
http.interceptors.request.use(
  (config) => {
    const token = getTokenDetail();
    if (token) {
      (config.headers ?? {}).Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData && config.headers) {
      config.headers['Content-Type'] = 'multipart/form-data';
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default http;
