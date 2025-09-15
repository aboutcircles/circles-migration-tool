import { useEffect, useRef } from "react";
import toast from "react-hot-toast";

type Opts = {
  id: string;
  isLoading: boolean;
  loading: string;
  error?: string | null;
  success?: string;
  silentSuccess?: boolean;
};

export function useLoadingToast({
  id, isLoading, loading, error, success, silentSuccess,
}: Opts) {
  const wasLoading = useRef(false);

  useEffect(() => {
    if (isLoading && !wasLoading.current) {
      toast.loading(loading, { id });
      wasLoading.current = true;
      return;
    }
    if (!isLoading && wasLoading.current) {
      if (error) {
        toast.error(error, { id });
      } else if (success && !silentSuccess) {
        toast.success(success, { id });
      } else {
        toast.dismiss(id);
      }
      wasLoading.current = false;
    }
  }, [id, isLoading, loading, error, success, silentSuccess]);
}
