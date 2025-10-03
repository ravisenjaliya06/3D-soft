import { REDIRECT, STATUS_CODES } from '@/services/CommonStatus';
import http from '@/services/http-common';
import Cookies from 'js-cookie';

export type AppName = 'user' | 'design' | 'mes_portal' | 'material';
export type RemainingPath =
  | ''
  | 'register'
  | 'catalog_item'
  | 'project'
  | 'delete_project'
  | 'design'
  | 'catalog'
  | 'organization/users'
  | 'organization/remove_user'
  | 'organization/details'
  | 'setting'
  | 'settings'
  | `${string}/settings`
  | `${string}/object`
  | 'catalog/default'
  | `${string}/object/?is_custom=True`
  | `object/?is_custom=True`
  | `object/?is_custom=False`
  | `${string}/nesting`
  | `${string}/catalog/item/${string}`
  | 'work_order'
  | 'material'
  | 'company'
  | `company/${string}/material`
  | `catalog_rules/${string}/parts`;

type Param = 'recent' | 'deleted' | 'project_id' | 'is_custom' | `type` | 'design_id';

type Error = {
  message: string;
  status: number;
};

class CommonService {
  get(AppName: AppName, RemainingPath: RemainingPath | null) {
    const url =
      RemainingPath === '' ? `/${AppName}/` : `/${AppName}/${RemainingPath}/`;
    return http.get(url).catch((err: Error) => {
      if (
        err.status == STATUS_CODES.UNAUTHORIZED &&
        typeof window !== 'undefined'
      ) {
        Cookies.remove('token', { path: '' });
        localStorage.clear();
        window.location.href = REDIRECT.UNAUTHORIZED;
      }
      throw err?.message;
    });
  }

  getWithIds(
    AppName: AppName,
    project_id: string | number,
    design: string,
    design_id: string | number,
  ) {
    return http
      .get(`/${AppName}/${project_id}/${design}/${design_id}/`)
      .catch((err: Error) => {
        if (err.status == STATUS_CODES.UNAUTHORIZED) {
          Cookies.remove('token', { path: '' });
          localStorage.clear();
          window.location.href = REDIRECT.UNAUTHORIZED;
        }
        throw err?.message;
      });
  }

  getWithQueryParam(
    AppName: AppName,
    RemainingPath: RemainingPath | null,
    Param: Param,
    value: string | number,
  ) {
    const url = RemainingPath
      ? `/${AppName}/${RemainingPath}/?${Param}=${value}`
      : `/${AppName}/?${Param}=${value}`;

    return http.get(url).catch((err: Error) => {
      if (
        err.status == STATUS_CODES.UNAUTHORIZED &&
        typeof window !== 'undefined'
      ) {
        Cookies.remove('token', { path: '' });
        localStorage.clear();
        window.location.href = REDIRECT.UNAUTHORIZED;
      }
      throw err?.message;
    });
  }

  post<T>(AppName: string, RemainingPath: string | null, data: T) {
    const url = RemainingPath
      ? `/${AppName}/${RemainingPath}/`
      : `/${AppName}/`;
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

  postWithSingleParam(
    AppName: AppName,
    RemainingPath: RemainingPath,
    value1: string | number,
  ) {
    return http
      .post(`/${AppName}/${RemainingPath}/${value1}/`)
      .catch((err: Error) => {
        if (err.status !== STATUS_CODES.CREATED) {
          this.handleError(err?.status || 500, err);
        }
        throw err?.message;
      });
  }

  postWithDoubleParam(
    AppName: AppName,
    RemainingPath: RemainingPath,
    value1: string | number,
    value2: string | number,
  ) {
    return http
      .post(`/${AppName}/${RemainingPath}/${value1}/${value2}`)
      .catch((err: Error) => {
        if (err.status !== STATUS_CODES.CREATED) {
          this.handleError(err?.status || 500, err);
        }
        throw err?.message;
      });
  }

  postWithFormData<payloadType>(
    AppName: AppName,
    RemainingPath: RemainingPath,
    data: payloadType,
  ) {
    return http
      .post(`/${AppName}/${RemainingPath}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .catch((err: Error) => {
        if (err.status !== STATUS_CODES.CREATED) {
          this.handleError(err?.status || 500, err);
        }
        throw err?.message;
      });
  }

  postWithFormDataWithQueryParam<payloadType>(
    AppName: AppName,
    RemainingPath: RemainingPath,
    data: payloadType,
    Param: Param,
    value: string | number,
  ) {
    return http
      .post(`/${AppName}/${RemainingPath}?${Param}=${value}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .catch((err: Error) => {
        if (err.status == STATUS_CODES.CREATED) {
          this.handleError(err?.status || 500, err);
        }
        throw err?.message;
      });
  }

  delete(AppName: AppName, RemainingPath: RemainingPath | string | null) {
    return http.delete(`/${AppName}/${RemainingPath}/`).catch((err: Error) => {
      if (err.status == STATUS_CODES.UNAUTHORIZED) {
        Cookies.remove('token', { path: '' });
        localStorage.clear();
        window.location.href = REDIRECT.UNAUTHORIZED;
      }
      throw err?.message;
    });
  }

  put<payloadType>(
    AppName: string,
    RemainingPath: string | null,
    data: payloadType,
  ) {
    const url = RemainingPath
      ? `/${AppName}/${RemainingPath}/`
      : `/${AppName}/`;
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

  putWithFormData<payloadType>(
    AppName: AppName,
    RemainingPath: RemainingPath | string,
    data: payloadType,
  ) {
    return http
      .put(`/${AppName}/${RemainingPath}/`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .catch((err: Error) => {
        if (err.status !== STATUS_CODES.UPDATED) {
          this.handleError(err?.status || 500, err);
        }
        throw err?.message;
      });
  }

  putWithSingleParam<payloadType>(
    AppName: AppName,
    RemainingPath: RemainingPath,
    value: string | number,
    data: payloadType,
  ) {
    const url = RemainingPath
      ? `/${AppName}/${RemainingPath}/${value}/`
      : `/${AppName}/${value}/`;
    return http.put(url, data).catch((err: Error) => {
      if (err.status !== STATUS_CODES.UPDATED) {
        this.handleError(err?.status || 500, err);
      }
      throw err?.message;
    });
  }

  deleteWithSingleParam(
    AppName: AppName,
    RemainingPath: RemainingPath | null,
    value: string | number,
  ) {
    const url = RemainingPath
      ? `/${AppName}/${RemainingPath}/${value}/`
      : `/${AppName}/${value}/`;

    return http.delete(url).catch((err: Error) => {
      if (err.status !== STATUS_CODES.DELETED) {
        this.handleError(err?.status || 500, err);
      }
      throw err?.message;
    });
  }

  deleteWithQueryParam(
    AppName: AppName,
    DesignId: string | number,
    RemainingPath: RemainingPath,
  ) {
    return http
      .delete(`/${AppName}/${DesignId}/${RemainingPath}`)
      .catch((err: Error) => {
        if (err.status == STATUS_CODES.UNAUTHORIZED) {
          Cookies.remove('token', { path: '' });
          localStorage.clear();
          window.location.href = REDIRECT.UNAUTHORIZED;
        }
        throw err?.message;
      });
  }

  // ***** object services ***** //
  getObjectData(AppName: AppName, designId: string | number, objects: string) {
    return http
      .get(`/${AppName}/${designId}/${objects}/`)
      .catch((err: Error) => {
        if (err.status !== STATUS_CODES.OK) {
          this.handleError(err?.status || 500, err);
        }
        throw err?.message;
      });
  }

  postObjectData<payloadType>(
    AppName: AppName,
    designId: string | number,
    object: string,
    data: payloadType,
  ) {
    return http
      .post(`/${AppName}/${designId}/${object}/`, data)
      .catch((err: Error) => {
        if (err.status !== STATUS_CODES.CREATED) {
          this.handleError(err?.status || 500, err);
        }
        throw err?.message;
      });
  }

  putObjectData<payloadType>(
    AppName: AppName,
    designId: string | number,
    object: string,
    formData: payloadType,
  ) {
    return http
      .put(`/${AppName}/${designId}/${object}/`, formData)
      .then((response) => {
        return { status: response.status, data: response.data };
      })
      .catch((err: Error) => {
        if (err.status !== STATUS_CODES.UPDATED) {
          this.handleError(err?.status || 500, err);
        }
        throw err?.message;
      });
  }

  deleteObjectData(
    AppName: AppName,
    designId: string | number,
    object: string,
    objectId: string | number,
  ) {
    return http
      .delete(`/${AppName}/${designId}/${object}/${objectId}/`)
      .catch((err: Error) => {
        if (err.status !== STATUS_CODES.DELETED) {
          this.handleError(err?.status || 500, err);
        }
        throw err?.message;
      });
  }

  putObjectItemData<payloadType>(
    AppName: AppName,
    designId: string | number,
    objects: string,
    objectItemId: string | number,
    data: payloadType,
  ) {
    return http
      .put(`/${AppName}/${designId}/${objects}/${objectItemId}/`, data)
      .catch((err: Error) => {
        if (err.status !== STATUS_CODES.UPDATED) {
          this.handleError(err?.status || 500, err);
        }
        throw err?.message;
      });
  }

  deleteDesignObjectsData<payloadType>(
    AppName: AppName,
    designId: string | number,
    object: string,
    data?: payloadType,
  ) {
    const config = {
      data,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };
    return http
      .delete(`/${AppName}/${designId}/${object}/`, config)
      .catch((err: Error) => {
        if (err.status !== STATUS_CODES.DELETED) {
          this.handleError(err?.status || 500, err);
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
