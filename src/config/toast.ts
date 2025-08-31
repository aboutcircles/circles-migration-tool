import { toast } from 'react-hot-toast';

export const toastConfig = {
  duration: 4000,
  position: 'top-right' as const,
  
  style: {
    borderRadius: '0.5rem',
    background: 'hsl(var(--b1))',
    color: 'hsl(var(--bc))',
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    border: '1px solid hsl(var(--b3))',
    padding: '16px',
    fontSize: '14px',
  },

  success: {
    iconTheme: {
      primary: 'hsl(var(--su))',
      secondary: 'hsl(var(--suc))',
    },
  },
  error: {
    iconTheme: {
      primary: 'hsl(var(--er))',
      secondary: 'hsl(var(--erc))',
    },
  },
};

export const showToast = {
  success: (message: string, options?: any) => 
    toast.success(message, { 
      ...toastConfig, 
      ...toastConfig.success, 
      ...options 
    }),
    
  error: (message: string, options?: any) => 
    toast.error(message, { 
      ...toastConfig, 
      ...toastConfig.error, 
      duration: 6000, 
      ...options 
    }),
    
  loading: (message: string, options?: any) => 
    toast.loading(message, { 
      ...toastConfig, 
      ...options 
    }),
    
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    },
    options?: any
  ) => 
    toast.promise(promise, messages, { 
      ...toastConfig, 
      ...options 
    }),
};
