import { useCallback, useEffect, useRef, useState } from 'react';

export default function useLoading(load, initialData, enabled = true) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const requestId = useRef(0);

  const retry = useCallback(async () => {
    const currentRequestId = requestId.current + 1;
    requestId.current = currentRequestId;
    setLoading(true);
    setError(null);

    try {
      const result = await load();
      if (requestId.current === currentRequestId) {
        setData(result);
      }
    } catch (requestError) {
      if (requestId.current === currentRequestId) {
        setError(requestError.message || 'Unable to load data');
      }
    } finally {
      if (requestId.current === currentRequestId) {
        setLoading(false);
      }
    }
  }, [load]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }

    retry();
    return () => {
      requestId.current += 1;
    };
  }, [enabled, retry]);

  return { data, loading, error, retry };
}
