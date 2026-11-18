import { useCallback, useEffect, useState } from 'react';

/**
 * Runs an async loader whenever `deps` change.
 * Returns { data, error, loading, reload, setData }; previous data stays visible while reloading.
 */
export function useAsync(loader, deps) {
  const [version, setVersion] = useState(0);
  const key = JSON.stringify([...deps, version]);
  const [state, setState] = useState({ key: null, data: null, error: null });

  useEffect(() => {
    let active = true;
    loader()
      .then((data) => active && setState({ key, data, error: null }))
      .catch((error) => active && setState((prev) => ({ key, data: prev.data, error })));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const setData = useCallback(
    (updater) =>
      setState((prev) => ({
        ...prev,
        data: typeof updater === 'function' ? updater(prev.data) : updater,
      })),
    [],
  );

  const loading = state.key !== key;
  return { data: state.data, error: loading ? null : state.error, loading, reload, setData };
}
