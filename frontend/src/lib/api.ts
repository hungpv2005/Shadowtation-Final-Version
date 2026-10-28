const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:4000/api/v1`
    : 'http://127.0.0.1:4000/api/v1');

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface ApiFetchOptions extends RequestInit {
  /**
   * Thời gian lưu cache trong bộ nhớ Client (tính bằng mili-giây).
   * - Mặc định các request GET thông thường sẽ được tự động gán TTL tối ưu (10s - 60s).
   * - Truyền 0 để tắt cache và luôn gửi request mạng mới.
   */
  cacheTtlMs?: number;

  /**
   * Nếu true, bỏ qua dữ liệu cache trong bộ nhớ và bắt buộc fetch mới từ mạng.
   */
  forceRefresh?: boolean;
}

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

// Bộ nhớ đệm Client-side cho các truy vấn GET (SWR / Memory Cache)
const cacheStore = new Map<string, CacheEntry<any>>();

// Hàng đợi gộp các request mạng đang chạy (In-Flight Request Deduplication)
const inFlightRequests = new Map<string, Promise<any>>();

function getCacheKey(path: string, token?: string | null): string {
  const userScope = token ? token.slice(-12) : 'guest';
  return `${userScope}:${path}`;
}

/**
 * Xóa cache API theo chuỗi khóa hoặc toàn bộ bộ nhớ đệm
 */
export function invalidateApiCache(pattern?: string | RegExp) {
  if (!pattern) {
    cacheStore.clear();
    return;
  }
  for (const key of Array.from(cacheStore.keys())) {
    if (typeof pattern === 'string' && key.includes(pattern)) {
      cacheStore.delete(key);
    } else if (pattern instanceof RegExp && pattern.test(key)) {
      cacheStore.delete(key);
    }
  }
}

let refreshInFlight: Promise<string | null> | null = null;

function clearStoredSession() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('student_profile');
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('refresh_token');
  sessionStorage.removeItem('student_profile');
  invalidateApiCache();
  window.dispatchEvent(new Event('shadowtation:auth-change'));
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  const refreshToken =
    localStorage.getItem('refresh_token') ?? sessionStorage.getItem('refresh_token');
  if (!refreshToken) return null;

  refreshInFlight = (async () => {
    let response: Response;
    try {
      response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        cache: 'no-store',
      });
    } catch {
      return null;
    }
    if (response.status === 401 || response.status === 403) {
      clearStoredSession();
      return null;
    }
    if (!response.ok) return null;
    try {
      const result = (await response.json()) as {
        accessToken?: string;
        refreshToken?: string;
      };
      if (!result.accessToken || !result.refreshToken) return null;
      localStorage.setItem('access_token', result.accessToken);
      localStorage.setItem('refresh_token', result.refreshToken);
      sessionStorage.setItem('access_token', result.accessToken);
      sessionStorage.setItem('refresh_token', result.refreshToken);
      window.dispatchEvent(new Event('shadowtation:auth-change'));
      return result.accessToken;
    } catch {
      return null;
    }
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

function determineTtl(path: string, method: string, optionsTtl?: number): number {
  if (method !== 'GET' && method !== 'HEAD') return 0;
  if (optionsTtl !== undefined) return Math.max(0, optionsTtl);

  // Không cache các endpoint polling hoặc kiểm tra trạng thái AI thời gian thực
  if (path.includes('/status/') || path.includes('/refresh')) return 0;

  // Dữ liệu cá nhân động (Profile, Stats, Tiến độ) -> Cache 10s - 15s để chuyển trang mượt mà
  if (path.includes('/auth/me')) return 10000;
  if (path.includes('/learning/stats') || path.includes('/learning/dashboard')) return 15000;

  // Danh mục bài học, từ vựng, cấu hình và gói cước -> Cache 60s - 120s
  if (path.startsWith('/lessons') || path.includes('/lessons')) return 60000;
  if (path.includes('subscription-plans') || path.includes('subscription/plans')) return 120000;
  if (path.includes('/system-configs')) return 60000;
  if (path.includes('/admin/users') || path.includes('/admin/transactions')) return 15000;

  // Mặc định cho mọi request GET khác: 10 giây
  return 10000;
}

function autoInvalidateOnMutation(path: string) {
  if (path.includes('/practice/') || path.includes('/lessons')) {
    invalidateApiCache('/lessons');
    invalidateApiCache('/learning/');
    invalidateApiCache('/practice/');
  }
  if (path.includes('/admin/lessons')) {
    invalidateApiCache('/lessons');
    invalidateApiCache('/admin/lessons');
  }
  if (path.includes('subscription')) {
    invalidateApiCache('subscription');
  }
  if (path.includes('/admin/users') || path.includes('/auth/')) {
    invalidateApiCache('/auth/me');
    invalidateApiCache('/admin/users');
  }
}

/**
 * Gọi Core API với cơ chế tự động tối ưu cache và gộp request song song (Request Deduplication)
 */
export async function apiFetch<T>(path: string, init: ApiFetchOptions = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const ttl = determineTtl(path, method, init.cacheTtlMs);

  const getCurrentToken = (tokenOverride?: string) => {
    if (tokenOverride) return tokenOverride;
    if (typeof window === 'undefined') return null;
    return (
      localStorage.getItem('access_token') ??
      sessionStorage.getItem('access_token') ??
      localStorage.getItem('accessToken') ??
      sessionStorage.getItem('accessToken')
    );
  };

  const token = getCurrentToken();
  const cacheKey = getCacheKey(path, token);

  // 1. Kiểm tra cache trong bộ nhớ (Client-side memory cache)
  if (ttl > 0 && !init.forceRefresh) {
    const cached = cacheStore.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      return cached.data as T;
    }
  }

  // 2. Kiểm tra request trùng lặp đang chạy (In-flight request deduplication)
  if (ttl > 0 && inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey) as Promise<T>;
  }

  // 3. Thực thi gọi mạng
  const executeFetch = async (tokenOverride?: string): Promise<T> => {
    const send = (tok?: string) => {
      const headers = new Headers(init.headers);
      const isMultipart = typeof FormData !== 'undefined' && init.body instanceof FormData;
      if (!headers.has('Content-Type') && !isMultipart) {
        headers.set('Content-Type', 'application/json');
      }

      const activeToken = getCurrentToken(tok);
      if (activeToken) {
        headers.set('Authorization', `Bearer ${activeToken}`);
      }

      // Không ép cứng 'no-store' nếu request là GET hoặc đã được chỉ định cache
      const fetchCache: RequestCache =
        init.cache ?? (method === 'GET' ? 'default' : 'no-store');

      return fetch(`${API_URL}${path}`, {
        ...init,
        headers,
        cache: fetchCache,
      });
    };

    let res = await send(tokenOverride);

    // Xử lý làm mới token (Token Refresh) khi hết hạn 401
    if (res.status === 401 && typeof window !== 'undefined' && !path.startsWith('/auth/')) {
      const refreshToken =
        localStorage.getItem('refresh_token') ?? sessionStorage.getItem('refresh_token');
      if (refreshToken) {
        const freshToken = await refreshAccessToken();
        if (freshToken) res = await send(freshToken);
      } else if (
        localStorage.getItem('access_token') ||
        sessionStorage.getItem('access_token') ||
        localStorage.getItem('accessToken') ||
        sessionStorage.getItem('accessToken')
      ) {
        clearStoredSession();
      }
    }

    if (!res.ok) {
      let message = res.statusText;
      try {
        const body = await res.json();
        message = body.message ?? message;
      } catch {
        /* Phản hồi không phải JSON */
      }
      throw new ApiError(res.status, message);
    }

    const data = (await res.json()) as T;

    // Lưu vào bộ nhớ đệm nếu là request GET hợp lệ
    if (ttl > 0) {
      cacheStore.set(cacheKey, {
        data,
        expiry: Date.now() + ttl,
      });
    }

    // Nếu là thao tác ghi/sửa dữ liệu (Mutation), tự động dọn cache các danh mục liên quan
    if (method !== 'GET' && method !== 'HEAD') {
      autoInvalidateOnMutation(path);
    }

    return data;
  };

  if (ttl > 0) {
    const reqPromise = executeFetch(token ?? undefined).finally(() => {
      inFlightRequests.delete(cacheKey);
    });
    inFlightRequests.set(cacheKey, reqPromise);
    return reqPromise;
  }

  return executeFetch(token ?? undefined);
}
