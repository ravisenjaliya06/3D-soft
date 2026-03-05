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
      let payload: any;

      if (webhookUrl) {
        // Google Chat Card format
        payload = {
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
                            `<b>Status Code:</b> <code>${status}</code><br>` +
                            `<b>Method:</b> <code>${method}</code>`,
                        },
                      },
                      {
                        textParagraph: {
                          text: `<b>Error Message:</b><br><code>${err?.message || 'No message provided'}</code>`,
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
      }

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
