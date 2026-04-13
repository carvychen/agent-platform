import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { useCallback } from "react";
import { loginScopes } from "./msalConfig";

export function useAuth() {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const login = useCallback(async () => {
    await instance.loginRedirect({ scopes: loginScopes });
  }, [instance]);

  const logout = useCallback(async () => {
    await instance.logoutRedirect();
  }, [instance]);

  const getAccessToken = useCallback(async (): Promise<string> => {
    const account = accounts[0];
    if (!account) throw new Error("No active account");

    const response = await instance.acquireTokenSilent({
      scopes: loginScopes,
      account,
    });
    return response.accessToken;
  }, [instance, accounts]);

  return {
    isAuthenticated,
    user: accounts[0] || null,
    login,
    logout,
    getAccessToken,
  };
}
