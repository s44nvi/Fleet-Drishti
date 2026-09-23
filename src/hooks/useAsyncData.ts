import { useEffect, useState, type DependencyList } from "react";

interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: unknown;
}

// Thin data-fetching hook aimed at the service layer (src/services). Works
// identically whether the service call resolves mock data instantly or a
// real network request later — components never need to change.
export function useAsyncData<T>(fetcher: () => Promise<T>, deps: DependencyList = []): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: undefined, loading: true, error: undefined });

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true }));

    fetcher()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: undefined });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ data: undefined, loading: false, error });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
