export const getApiHeaders = (headers = {}) => ({
  "ngrok-skip-browser-warning": "true",
  ...headers,
});
