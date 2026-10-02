import React, { createContext, useContext, useState, useCallback } from 'react';
import { AppLogoLoader } from '@/components/AppLogoLoader';

export interface LoadingOptions {
  title?: string;
  message?: string;
  submessage?: string;
}

export interface LoadingContextType {
  isLoading: boolean;
  showLoading: (message?: string, options?: Omit<LoadingOptions, 'message'>) => void;
  hideLoading: () => void;
  withLoading: <T>(
    asyncFn: () => Promise<T>,
    message?: string,
    options?: Omit<LoadingOptions, 'message'>
  ) => Promise<T>;
}

const LoadingContext = createContext<LoadingContextType>({
  isLoading: false,
  showLoading: () => {},
  hideLoading: () => {},
  withLoading: async (fn) => await fn(),
});

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loadingCount, setLoadingCount] = useState<number>(0);
  const [options, setOptions] = useState<LoadingOptions>({
    title: 'HÎNNEH ÉDUCATION',
    message: 'Chargement en cours...',
  });

  const showLoading = useCallback((message?: string, opts?: Omit<LoadingOptions, 'message'>) => {
    setOptions({
      title: opts?.title || 'HÎNNEH ÉDUCATION',
      message: message || 'Chargement en cours...',
      submessage: opts?.submessage,
    });
    setLoadingCount((c) => c + 1);
  }, []);

  const hideLoading = useCallback(() => {
    setLoadingCount((c) => Math.max(0, c - 1));
  }, []);

  const withLoading = useCallback(
    async <T,>(
      asyncFn: () => Promise<T>,
      message?: string,
      opts?: Omit<LoadingOptions, 'message'>
    ): Promise<T> => {
      showLoading(message, opts);
      try {
        return await asyncFn();
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading]
  );

  return (
    <LoadingContext.Provider
      value={{
        isLoading: loadingCount > 0,
        showLoading,
        hideLoading,
        withLoading,
      }}
    >
      {children}
      {loadingCount > 0 && (
        <AppLogoLoader
          fullScreen
          title={options.title}
          message={options.message}
          submessage={options.submessage}
        />
      )}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => useContext(LoadingContext);
export default LoadingContext;
