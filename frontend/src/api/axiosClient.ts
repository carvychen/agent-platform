import axios from "axios";
import { msalInstance } from "../auth/AuthProvider";
import { loginScopes } from "../auth/msalConfig";

const apiClient = axios.create({
  baseURL: "/api",
});

let cachedToken: { token: string; expiresOn: number } | null = null;
let inflightRequest: Promise<string | null> | null = null;

async function getAccessToken(): Promise<string | null> {
  // Return cached token if still valid (with 60s buffer before expiry)
  if (cachedToken && Date.now() < cachedToken.expiresOn - 60_000) {
    return cachedToken.token;
  }

  // Deduplicate concurrent token requests
  if (inflightRequest) {
    return inflightRequest;
  }

  inflightRequest = (async () => {
    const account = msalInstance.getActiveAccount();
    if (!account) return null;

    try {
      const response = await msalInstance.acquireTokenSilent({
        scopes: loginScopes,
        account,
      });
      cachedToken = {
        token: response.accessToken,
        expiresOn: response.expiresOn
          ? response.expiresOn.getTime()
          : Date.now() + 3600_000,
      };
      return cachedToken.token;
    } catch {
      cachedToken = null;
      return null;
    }
  })();

  try {
    return await inflightRequest;
  } finally {
    inflightRequest = null;
  }
}

apiClient.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
