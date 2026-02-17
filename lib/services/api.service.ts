import { API_CONFIG } from '../config/api.config';
import { APIError } from '@/types/api';

export class APIClient {
  private baseURL: string;
  private timeout: number;
  private defaultHeaders: Record<string, string>;

  constructor() {
    this.baseURL = API_CONFIG.baseURL;
    this.timeout = API_CONFIG.timeout;
    this.defaultHeaders = API_CONFIG.headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: APIError = await response.json().catch(() => ({
        error: 'Unknown Error',
        message: response.statusText,
        statusCode: response.status,
      }));
      throw error;
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json();
    }

    return response.text() as T;
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'GET',
        headers: { ...this.defaultHeaders },
        signal: controller.signal,
        ...options,
      });

      return this.handleResponse<T>(response);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async post<T>(
    endpoint: string,
    data?: any,
    options?: RequestInit
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: { ...this.defaultHeaders },
        body: JSON.stringify(data),
        signal: controller.signal,
        ...options,
      });

      return this.handleResponse<T>(response);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async postFormData<T>(
    endpoint: string,
    formData: FormData,
    options?: RequestInit
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        ...options,
      });

      return this.handleResponse<T>(response);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'DELETE',
        headers: { ...this.defaultHeaders },
        signal: controller.signal,
        ...options,
      });

      return this.handleResponse<T>(response);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Stream support for SSE
  async *stream(
    endpoint: string,
    data?: any
  ): AsyncGenerator<string, void, unknown> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: {
        ...this.defaultHeaders,
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw await this.handleResponse(response);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('Response body is not readable');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            yield line.slice(6);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

// Singleton instance
export const apiClient = new APIClient();
