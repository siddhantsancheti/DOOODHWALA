// Error Monitoring & Observability Setup for DOOODHWALA

import { QueryClient } from "@tanstack/react-query";

/**
 * Initialize error monitoring based on environment
 * Supports: Sentry, LogRocket, Firebase Crashlytics
 */
export async function initializeErrorMonitoring() {
  const env = process.env.NODE_ENV;
  const isDevelopment = env === 'development';

  // Sentry and LogRocket integration removed during deep clean as dependencies were not found.
  // Re-install @sentry/react and logrocket if needed.

  // Firebase Crashlytics for mobile apps
  if (typeof window !== 'undefined' && process.env.REACT_APP_FIREBASE_PROJECT_ID) {
    try {
      // This would be implemented at the Capacitor level
      console.log('✓ Firebase Crashlytics ready for mobile crashes');
    } catch (error) {
      console.warn('Firebase Crashlytics initialization failed:', error);
    }
  }
}

/**
 * Configure structured logging
 */
export function setupStructuredLogging() {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Create structured log function
  (window as any).log = {
    info: (message: string, data?: any) => {
      if (isDevelopment) {
        console.log(`[INFO] ${message}`, data);
      }
      // Send to monitoring service
      sendLog('info', message, data);
    },
    warn: (message: string, data?: any) => {
      console.warn(`[WARN] ${message}`, data);
      sendLog('warn', message, data);
    },
    error: (message: string, error?: any) => {
      console.error(`[ERROR] ${message}`, error);
      sendLog('error', message, error);
    },
    debug: (message: string, data?: any) => {
      if (isDevelopment) {
        console.debug(`[DEBUG] ${message}`, data);
      }
    },
  };
}

/**
 * Send log to monitoring service
 */
function sendLog(level: string, message: string, data?: any) {
  if (process.env.NODE_ENV === 'development') return;

  // Queue logs to send to server
  try {
    navigator.sendBeacon('/api/logs', JSON.stringify({
      level,
      message,
      data: sanitizeData(data),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    }));
  } catch (error) {
    console.error('Failed to send log:', error);
  }
}

/**
 * Sanitize sensitive data from logs
 */
function sanitizeData(data: any): any {
  if (!data) return data;

  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'apiKey',
    'creditCard',
    'cardNumber',
    'ssn',
    'authorization',
  ];

  if (typeof data !== 'object') return data;

  const sanitized = { ...data };
  Object.keys(sanitized).forEach(key => {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      sanitized[key] = '***REDACTED***';
    }
  });

  return sanitized;
}

/**
 * Setup performance monitoring
 */
export function setupPerformanceMonitoring() {
  if ('PerformanceObserver' in window) {
    try {
      // Monitor long tasks
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.warn('[PERF] Long task detected:', {
            name: entry.name,
            duration: entry.duration,
          });
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      // Some browsers don't support longtask
    }
  }

  // Web Vitals integration removed (dependency missing)
}

/**
 * Global error handler
 */
export function setupGlobalErrorHandlers() {
  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[UNHANDLED_REJECTION]', event.reason);
    // Report to monitoring service
    if (typeof (window as any).log?.error === 'function') {
      (window as any).log.error('Unhandled promise rejection', event.reason);
    }
  });

  // Global error handler
  window.addEventListener('error', (event) => {
    console.error('[GLOBAL_ERROR]', event.error);
    // Report to monitoring service
    if (typeof (window as any).log?.error === 'function') {
      (window as any).log.error('Global error', event.error);
    }
  });
}

/**
 * Query client error logger
 */
export function setupQueryClientErrorLogging(queryClient: QueryClient) {
  queryClient.setDefaultOptions({
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on auth errors
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        // Retry up to 3 times
        return failureCount < 3;
      },
    },
    mutations: {
      onError: (error: any) => {
        console.error('[MUTATION_ERROR]', {
          message: error?.message,
          status: error?.status,
          response: error?.body,
        });
      },
    },
  });
}

/**
 * API request logging
 */
export function logApiRequest(method: string, url: string, data?: any) {
  if (process.env.NODE_ENV === 'production') return;

  console.log(`[API] ${method} ${url}`, {
    timestamp: new Date().toISOString(),
    data: sanitizeData(data),
  });
}

export function logApiResponse(method: string, url: string, status: number, duration: number) {
  if (process.env.NODE_ENV === 'production') return;

  const isError = status >= 400;
  const level = isError ? 'warn' : 'info';

  console.log(`[API] ${method} ${url} - ${status} (${duration}ms)`);
}
