import Taro from '@tarojs/taro';
import * as localData from './local-data';

// 声明构建时注入的常量（通过 defineConstants 配置）
declare const TARO_APP_API_URL: string;
// 是否离线模式（无后端服务器）
declare const TARO_APP_OFFLINE: string;

// API Base URL Configuration
const getBaseUrl = (): string => {
    if (typeof TARO_APP_API_URL !== 'undefined' && TARO_APP_API_URL) {
        return TARO_APP_API_URL;
    }
    const env = Taro.getEnv();
    if (env === Taro.ENV_TYPE.WEAPP) {
        return 'https://your-domain.com';
    }
    if (env === Taro.ENV_TYPE.WEB) {
        return '';
    }
    return 'http://localhost:3000';
};

const BASE_URL = getBaseUrl();
const IS_OFFLINE = typeof TARO_APP_OFFLINE !== 'undefined' && TARO_APP_OFFLINE === 'true';

// 本地数据路由表：URL -> 处理函数
const localRoutes: Record<string, (data: any) => any> = {
  '/api/idioms/list': (d) => {
    const result = localData.getList(d);
    return { success: true, data: result };
  },
  '/api/idioms/search': (d) => {
    const result = localData.search(d);
    return { success: true, data: result };
  },
  '/api/idioms/detail': (d) => {
    const result = localData.getDetail(d.id);
    if (!result) return { success: false, error: 'Idiom not found' };
    return { success: true, ...result };
  },
  '/api/idioms/random': () => {
    const data = localData.getRandom();
    return { success: true, data };
  },
  '/api/idioms/categories': () => {
    const data = localData.getCategories();
    return { success: true, data };
  },
  '/api/idioms/quiz': (d) => {
    const questions = localData.getQuiz(d.count || 10);
    return { success: true, data: { questions } };
  },
  '/api/idioms/synonym-pair': () => {
    const data = localData.getSynonymPair();
    return { success: true, data };
  },
  '/api/health': () => ({ status: 'ok', timestamp: new Date().toISOString() }),
};

interface RequestConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: any;
  header?: Record<string, string>;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private getAuthToken(): string | null {
    try {
      return Taro.getStorageSync('auth_token');
    } catch {
      return null;
    }
  }

  private async request<T>(config: RequestConfig): Promise<T> {
    const { url, method = 'GET', data } = config;

    // 离线模式：直接调用本地数据
    if (IS_OFFLINE) {
      const handler = localRoutes[url];
      if (handler) {
        // 模拟异步
        return new Promise((resolve) => {
          setTimeout(() => resolve(handler(data) as T), 50);
        });
      }
      throw new Error(`Local route not found: ${url}`);
    }

    const token = this.getAuthToken();
    const header: Record<string, string> = { 'Content-Type': 'application/json', ...(config.header || {}) };
    if (token) header['Authorization'] = `Bearer ${token}`;

    try {
      const response = await Taro.request({
        url: `${this.baseURL}${url}`,
        method,
        data,
        header,
      });

      if (response.statusCode === 401) {
        Taro.removeStorageSync('auth_token');
        Taro.showToast({ title: 'Please login again', icon: 'none' });
        throw new Error('Unauthorized');
      }

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return response.data as T;
      }

      const errorData = response.data as any;
      throw new Error(errorData?.error || errorData?.message || `Request failed with status ${response.statusCode}`);
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  get<T>(url: string, header?: Record<string, string>): Promise<T> {
    return this.request<T>({ url, method: 'GET', header });
  }

  post<T>(url: string, data?: any, header?: Record<string, string>): Promise<T> {
    return this.request<T>({ url, method: 'POST', data, header });
  }

  put<T>(url: string, data?: any, header?: Record<string, string>): Promise<T> {
    return this.request<T>({ url, method: 'PUT', data, header });
  }

  patch<T>(url: string, data?: any, header?: Record<string, string>): Promise<T> {
    return this.request<T>({ url, method: 'PATCH', data, header });
  }

  delete<T>(url: string, header?: Record<string, string>): Promise<T> {
    return this.request<T>({ url, method: 'DELETE', header });
  }
}

export const apiClient = new ApiClient(BASE_URL);
export default apiClient;
