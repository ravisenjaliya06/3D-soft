import { store } from '@/components/3dmodel/store';
import { setBackendDown } from '@/components/3dmodel/store/backendStatusSlice';
import { CustomToast } from '@/components/3dmodel/utils/CustomToast';
import { getTokenDetail } from '@/components/helper/helper';
import axios from 'axios';
import React from 'react';
import { toast } from 'react-toastify';

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
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const ghostOrgId = typeof window !== 'undefined' ? localStorage.getItem('ghost_org_id') : null;
    if (ghostOrgId && config.headers) {
      config.headers['X-Organization-Id'] = ghostOrgId;
    }
    if (config.data instanceof FormData && config.headers) {
      config.headers['Content-Type'] = 'multipart/form-data';
    }
    return config;
  },
  (error) => Promise.reject(error)
);

http.interceptors.response.use(
  (response) => {
    // If we get a successful response, we can assume the backend is up
    // (Optional: reset backend status if it was down)
    const state = store.getState();
    if (state.backendStatus.isDown) {
      store.dispatch(setBackendDown(false));
    }
    return response;
  },
  (error) => {
    const isNetworkError =
      !error.response || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED';
    const isServerError = error.response && [502, 503, 504].includes(error.response.status);

    if (isNetworkError || isServerError) {
      store.dispatch(setBackendDown(true));
    }

    const message = error?.response?.data?.error || error?.response?.data?.detail;
    if (
      typeof window !== 'undefined' &&
      (message === 'You have read-only access as a ghost user.' ||
        message === 'You do not have permission to perform this action.')
    ) {
      toast(React.createElement(CustomToast, { appearance: 'error', message }), {
        position: 'top-right',
        toastId: 'ghost-readonly-access',
        containerId: 'global',
        className:
          '!overflow-hidden !rounded-[0.75rem] !border !border-[var(--primary-color)] !bg-white !p-0',
        style: { padding: 0, minHeight: 'auto' },
      });
    }
    return Promise.reject(error);
  }
);

export default http;
