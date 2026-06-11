"use client";

import { useEffect } from "react";
import axios from "axios";

const API_HEADER = "ngrok-skip-browser-warning";
const API_HEADER_VALUE = "true";

const getApiBaseUrl = () => {
  const rawBaseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || process.env.VITE_BASE_URL || "";

  return rawBaseUrl.endsWith("/") ? rawBaseUrl.slice(0, -1) : rawBaseUrl;
};

const getRequestUrl = (input) => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  if (input instanceof Request) return input.url;
  return "";
};

const shouldAttachHeader = (url, apiBaseUrl) => {
  if (!apiBaseUrl || !url) return false;
  return url.startsWith(apiBaseUrl);
};

export default function ApiTunnelHeaders() {
  useEffect(() => {
    const apiBaseUrl = getApiBaseUrl();
    if (!apiBaseUrl || window.fetch.__ngrokHeaderPatched) return;

    const originalFetch = window.fetch.bind(window);

    window.fetch = (input, init = {}) => {
      const url = getRequestUrl(input);
      if (!shouldAttachHeader(url, apiBaseUrl)) {
        return originalFetch(input, init);
      }

      const sourceHeaders =
        init.headers || (input instanceof Request ? input.headers : undefined);
      const headers = new Headers(sourceHeaders);
      headers.set(API_HEADER, API_HEADER_VALUE);

      if (input instanceof Request) {
        return originalFetch(new Request(input, { ...init, headers }));
      }

      return originalFetch(input, { ...init, headers });
    };

    window.fetch.__ngrokHeaderPatched = true;

    const interceptorId = axios.interceptors.request.use((config) => {
      const requestUrl = new URL(config.url || "", apiBaseUrl).toString();
      if (shouldAttachHeader(requestUrl, apiBaseUrl)) {
        config.headers = config.headers || {};
        config.headers[API_HEADER] = API_HEADER_VALUE;
      }

      return config;
    });

    return () => {
      window.fetch = originalFetch;
      axios.interceptors.request.eject(interceptorId);
    };
  }, []);

  return null;
}
