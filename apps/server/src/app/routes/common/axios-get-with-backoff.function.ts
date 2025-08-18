import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

interface BackoffOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  onRetry?(attempt: number, delayMs: number): void;
}

export async function axiosGetWithBackoff<T>(
  url: string,
  config: AxiosRequestConfig,
  options: BackoffOptions = {}
): Promise<AxiosResponse<T>> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelay = options.baseDelayMs ?? 5000;

  function swallowError(): undefined {
    return undefined;
  }

  function delayPromise(resolve: (value: unknown) => void, ms: number): void {
    setTimeout(resolve, ms);
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await axios
      .get<T>(url, config)
      .catch(swallowError);

    if (response !== undefined) {
      return response;
    }

    const delay = baseDelay * Math.pow(2, attempt);
    options.onRetry?.(attempt + 1, delay);
    // eslint-disable-next-line no-restricted-syntax -- Promise
    await new Promise(function namedDelay(resolve): void {
      delayPromise(resolve, delay);
    });
  }

  return axios.get<T>(url, config);
}


