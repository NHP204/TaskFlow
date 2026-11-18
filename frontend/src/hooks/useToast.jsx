import { useCallback, useEffect, useState } from 'react';

export function useToast() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const show = useCallback(
    (message, type = 'info') => setToast({ message, type, id: Date.now() }),
    [],
  );

  const element = toast && (
    <div key={toast.id} className={`toast toast-${toast.type}`} role="status">
      {toast.message}
    </div>
  );

  return { show, element };
}
