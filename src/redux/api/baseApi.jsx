import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { clearStoredAuth, getStoredTokens, loadStoredAuth } from "../authStorage";
import { getApiHeaders } from "@/utils/apiHeaders";
import {
  logout,
  setLogin,
  setTokens,
} from "../slices/authSlice";

const rawBaseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || process.env.VITE_BASE_URL || "";

const BASE_URL = rawBaseUrl.endsWith("/") ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

const unwrapResponse = (response) => {
  const firstLayer = response?.data ?? response ?? {};
  return firstLayer?.data ?? firstLayer;
};

const getAccessToken = (response) => {
  const payload = unwrapResponse(response);

  return (
    payload?.session?.accessToken ||
    payload?.tokens?.accessToken ||
    payload?.accessToken ||
    payload?.token ||
    null
  );
};

const getRefreshToken = (response) => {
  const payload = unwrapResponse(response);

  return (
    payload?.session?.refreshToken ||
    payload?.tokens?.refreshToken ||
    payload?.refreshToken ||
    null
  );
};

const getUser = (response) => {
  const payload = unwrapResponse(response);
  return payload?.user || (payload?.email ? payload : null);
};

const baseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const state = getState();
    const token =
      state?.auth?.token ||
      getStoredTokens()?.token ||
      loadStoredAuth()?.token;

    if (token && !headers.has("authorization")) {
      headers.set("authorization", `Bearer ${token}`);
    }

    headers.set("accept", "application/json");
    headers.set("ngrok-skip-browser-warning", "true");

    return headers;
  },
  headers: getApiHeaders(),
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result?.error?.status !== 401) {
    return result;
  }

  const refreshToken =
    api.getState()?.auth?.refreshToken ||
    getStoredTokens()?.refreshToken ||
    loadStoredAuth()?.refreshToken;

  if (!refreshToken) {
    api.dispatch(logout());
    clearStoredAuth();
    if (typeof window !== "undefined") {
      window.location.replace("/authentication/login");
    }
    return result;
  }

  const refreshResult = await baseQuery(
    {
      url: "/api/auth/refresh-auth",
      method: "POST",
      body: { refreshToken },
    },
    api,
    extraOptions
  );

  const nextToken = getAccessToken(refreshResult?.data);
  const nextRefreshToken = getRefreshToken(refreshResult?.data) || refreshToken;
  const user = getUser(refreshResult?.data);

  if (!nextToken) {
    api.dispatch(logout());
    clearStoredAuth();
    if (typeof window !== "undefined") {
      window.location.replace("/authentication/login");
    }
    return refreshResult?.error ? { error: refreshResult.error } : result;
  }

  if (user) {
    api.dispatch(
      setLogin({
        user,
        token: nextToken,
        refreshToken: nextRefreshToken,
      })
    );
  } else {
    api.dispatch(
      setTokens({
        token: nextToken,
        refreshToken: nextRefreshToken,
      })
    );
  }

  result = await baseQuery(args, api, extraOptions);

  return result;
};

export const baseApi = createApi({
  reducerPath: "baseApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Auth", "FAQ"],
  endpoints: () => ({}),
});

export { BASE_URL };

export default baseApi;
