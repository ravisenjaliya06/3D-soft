import { REDIRECT, STATUS_CODES } from '@/services/CommonStatus';
import http from '@/services/http-common';
import Cookies from 'js-cookie';

class CommonService {
  // ALL METHODS
  get(url: string) {
    return http.get(url).catch((err: any) => {
      const status = err.response?.status || err.status || 500;
      this.handleError(status, 'GET', url, err);
      if (status == STATUS_CODES.UNAUTHORIZED && typeof window !== 'undefined') {
        Cookies.remove('token', { path: '' });
        localStorage.clear();
        window.location.href = REDIRECT.UNAUTHORIZED;
      }
      throw err?.response?.data?.message || err?.message || 'An error occurred';
    });
  }

  post<payloadType>(url: string, data: payloadType) {
    return http
      .post(url, data)
      .then((response) => response)
      .catch((err) => {
        const status = err.response?.status || err.status || 500;
        if (status !== STATUS_CODES.CREATED) {
          this.handleError(status, 'POST', url, err);
        }
        return err.response || { status: status, data: null };
      });
  }

  put<payloadType>(url: string, data: payloadType) {
    return http
      .put(url, data)
      .then((response) => response)
      .catch((err) => {
        const status = err.response?.status || err.status || 500;
        if (status !== STATUS_CODES.UPDATED) {
          this.handleError(status, 'PUT', url, err);
        }
        return err.response || { status: status, data: null };
      });
  }

  delete<payloadType>(url: string, data?: payloadType) {
    return http.delete(url, data || {}).catch((err: any) => {
      const status = err.response?.status || err.status || 500;
      this.handleError(status, 'DELETE', url, err);
      if (status == STATUS_CODES.UNAUTHORIZED) {
        Cookies.remove('token', { path: '' });
        localStorage.clear();
        window.location.href = REDIRECT.UNAUTHORIZED;
      }
      throw err?.response?.data?.message || err?.message || 'An error occurred';
    });
  }

  private decodeJWTToken(token: string | undefined): {
    userId: string | null;
    username: string | null;
  } {
    if (!token) {
      return { userId: null, username: null };
    }

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { userId: null, username: null };
      }

      let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padding = (4 - (base64.length % 4)) % 4;
      base64 += '='.repeat(padding);

      const payload = JSON.parse(atob(base64));

      return {
        userId: payload.user_id || payload.userId || payload.sub || null,
        username: payload.username || payload.user_name || payload.name || null,
      };
    } catch (error) {
      console.error('Failed to decode JWT token:', error);
      return { userId: null, username: null };
    }
  }

  private _getErrorField(errorData: any): string | null {
    return (
      (typeof errorData?.message === 'string' && errorData.message) ||
      (typeof errorData?.error === 'string' && errorData.error) ||
      (typeof errorData?.detail === 'string' && errorData.detail) ||
      null
    );
  }

  private formatErrorResponse(err: any): string {
    if (!err?.response?.data) {
      return 'N/A';
    }

    const errorData = err.response.data;

    // Extract field-level errors (arrays and strings)
    const errorMessages = Object.entries(errorData)
      .filter(([, value]) => {
        return (
          (Array.isArray(value) && value.length > 0) || (typeof value === 'string' && value.trim())
        );
      })
      .map(([key, value]) => {
        return Array.isArray(value) ? `${key}: ${value.join(', ')}` : `${key}: ${value}`;
      });

    if (errorMessages.length > 0) {
      return errorMessages.join(' | ');
    }

    // Try common error fields
    const commonError = this._getErrorField(errorData);
    if (commonError) {
      return commonError;
    }

    // Fallback to JSON stringify
    try {
      return JSON.stringify(errorData, null, 2);
    } catch {
      return 'N/A';
    }
  }

  private getErrorMessage(err: any): string {
    const errorData = err?.response?.data;
    return errorData ? this._getErrorField(errorData) || '' : '';
  }

  private async sendWebhookNotification(
    method: string,
    url: string,
    status: number,
    err?: any
  ): Promise<void> {
    const webhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_URL;
    if (!webhookUrl) {
      return;
    }

    try {
      const token = typeof window !== 'undefined' ? Cookies.get('token') : undefined;
      const { userId, username } = this.decodeJWTToken(token);
      const errorMessage = this.getErrorMessage(err);
      const errorResponse = this.formatErrorResponse(err);

      const payload = {
        cardsV2: [
          {
            cardId: 'apiErrorCard',
            card: {
              header: {
                title: '🚨 API Error Detected 🚨',
                subtitle: `Error in ${method} request`,
              },
              sections: [
                {
                  header: 'Details',
                  widgets: [
                    {
                      textParagraph: {
                        text:
                          `<b>URL:</b> <code>${url}</code><br>` +
                          `<b>UserName:</b> <code>${username || 'N/A'}</code><br>` +
                          `<b>UserID:</b> <code>${userId || 'N/A'}</code><br>` +
                          `<b>Method:</b> <code>${method}</code><br>` +
                          `<b>Error Message:</b> <code>${errorMessage || ''}</code><br>` +
                          `<b>Status Code:</b> <code>${status}</code><br>` +
                          `<b>Error Response:</b> <code>${errorResponse}</code>`,
                      },
                    },
                    {
                      textParagraph: {
                        text: `<b>Timestamp:</b> ${new Date().toISOString()}`,
                      },
                    },
                  ],
                },
              ],
            },
          },
        ],
      };

      // Use native fetch to avoid recursion if http-common uses this service
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (webhookErr) {
      console.error('Failed to send webhook notification:', webhookErr);
    }
  }

  private handleError(status: number, method: string, url: string, err?: any): void {
    if (err) {
      console.error(`Error in ${method} ${url}:`, err.message);
    }

    // Send webhook notification for non-success statuses
    this.sendWebhookNotification(method, url, status, err);

    switch (status) {
      case STATUS_CODES.UNAUTHORIZED:
        if (typeof window !== 'undefined') {
          Cookies.remove('token', { path: '' });
          localStorage.clear();
          window.location.href = REDIRECT.UNAUTHORIZED;
        }
        break;

      case STATUS_CODES.NOT_FOUND:
        console.error('Resource not found.');
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
