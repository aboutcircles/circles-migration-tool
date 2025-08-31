import { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { showToast } from '../config/toast';

export const useToast = () => {
  
  const success = useCallback((message: string, options?: any) => {
    return showToast.success(message, options);
  }, []);

  const error = useCallback((message: string, options?: any) => {
    return showToast.error(message, options);
  }, []);

  const loading = useCallback((message: string, options?: any) => {
    return showToast.loading(message, options);
  }, []);

  const dismiss = useCallback((toastId?: string) => {
    return toast.dismiss(toastId);
  }, []);

  const dismissAll = useCallback(() => {
    return toast.dismiss();
  }, []);

  const promise = useCallback(<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    },
    options?: any
  ) => {
    return showToast.promise(promise, messages, options);
  }, []);

  const transaction = useCallback(async <T>(
    transactionPromise: Promise<T>,
    {
      pending = "Transaction pending...",
      success = "Transaction successful!",
      error = "Transaction failed"
    }: {
      pending?: string;
      success?: string | ((data: T) => string);
      error?: string | ((error: any) => string);
    } = {}
  ) => {
    return promise(transactionPromise, {
      loading: pending,
      success,
      error,
    });
  }, [promise]);

  return {
    success,
    error,
    loading,
    promise,
    transaction,
    dismiss,
    dismissAll,
  };
};
