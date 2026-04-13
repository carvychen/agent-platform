import axios from "axios";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig, loginScopes } from "../auth/msalConfig";

const apiClient = axios.create({
  baseURL: "/api",
});

apiClient.interceptors.request.use(async (config) => {
  const msalInstance = new PublicClientApplication(msalConfig);
  await msalInstance.initialize();
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) {
    try {
      const response = await msalInstance.acquireTokenSilent({
        scopes: loginScopes,
        account: accounts[0],
      });
      config.headers.Authorization = `Bearer ${response.accessToken}`;
    } catch {
      // Token acquisition failed — request will proceed without auth
      // and backend will return 401
    }
  }
  return config;
});

export default apiClient;
