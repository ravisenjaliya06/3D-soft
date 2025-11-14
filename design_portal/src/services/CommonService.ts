import { REDIRECT, STATUS_CODES } from '@/services/CommonStatus';
import http from '@/services/http-common';
import Cookies from 'js-cookie';

type Error = {
  message: string;
  status: number;
};

class CommonService {
  // ALL METHODS
  get(url: string) {
    return http.get(url).catch((err: Error) => {
      if (err.status == STATUS_CODES.UNAUTHORIZED && typeof window !== 'undefined') {
        Cookies.remove('token', { path: '' });
        localStorage.clear();
        window.location.href = REDIRECT.UNAUTHORIZED;
      }
      throw err?.message;
    });
  }

  post<payloadType>(url: string, data: payloadType) {
    return http
      .post(url, data)
      .then((response) => response)
      .catch((err) => {
        if (err.status !== STATUS_CODES.CREATED) {
          this.handleError(err?.status || 500, err);
        }
        return err.response || { status: err.status, data: null }; // Ensure consistent error response
      });
  }

  put<payloadType>(url: string, data: payloadType) {
    return http
      .put(url, data)
      .then((response) => response)
      .catch((err) => {
        if (err.status !== STATUS_CODES.UPDATED) {
          this.handleError(err?.status || 500, err);
        }
        return err.response || { status: err.status, data: null };
      });
  }

  delete<payloadType>(url: string, data?: payloadType) {
    return http.delete(url, data || {}).catch((err: Error) => {
      if (err.status == STATUS_CODES.UNAUTHORIZED) {
        Cookies.remove('token', { path: '' });
        localStorage.clear();
        window.location.href = REDIRECT.UNAUTHORIZED;
      }
      throw err?.message;
    });
  }

  private handleError(status: number, err?: Error): void {
    if (err) {
      console.error('Error details:', err.message);
    }
    switch (status) {
      case STATUS_CODES.UNAUTHORIZED:
        if (typeof window !== 'undefined') {
          Cookies.remove('token', { path: '' });
          localStorage.clear();
          window.location.href = REDIRECT.UNAUTHORIZED;
        }
        break;

      case STATUS_CODES.NOT_FOUND:
        console.error('Design not found.');
        break;

      case STATUS_CODES.BAD_REQUEST:
        console.error('Invalid request made.');
        break;

      case STATUS_CODES.INTERNAL_SERVER_ERROR:
        console.error('Server error occurred:', err || 'Internal Server Error');
        break;

      default:
        console.error('Unhandled status code:', status);
        break;
    }
  }
}

const commonService = new CommonService();

export default commonService;
