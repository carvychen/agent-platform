import { type ReactNode, useEffect, useState } from "react";
import { MsalProvider } from "@azure/msal-react";
import {
  PublicClientApplication,
  EventType,
  type AuthenticationResult,
} from "@azure/msal-browser";
import { msalConfig } from "./msalConfig";

const msalInstance = new PublicClientApplication(msalConfig);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await msalInstance.initialize();
        console.log("[MSAL] initialized, URL:", window.location.href);

        const response = await msalInstance.handleRedirectPromise();
        console.log("[MSAL] handleRedirectPromise result:", response ? "got response" : "null");

        if (response?.account) {
          console.log("[MSAL] setting active account from redirect:", response.account.username);
          msalInstance.setActiveAccount(response.account);
        }

        const allAccounts = msalInstance.getAllAccounts();
        console.log("[MSAL] getAllAccounts:", allAccounts.length, "accounts");

        if (!msalInstance.getActiveAccount() && allAccounts.length > 0) {
          console.log("[MSAL] setting active account from cache:", allAccounts[0].username);
          msalInstance.setActiveAccount(allAccounts[0]);
        }

        const active = msalInstance.getActiveAccount();
        console.log("[MSAL] active account:", active?.username ?? "none");

        msalInstance.addEventCallback((event) => {
          if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
            const result = event.payload as AuthenticationResult;
            msalInstance.setActiveAccount(result.account);
          }
        });
      } catch (error) {
        console.error("[MSAL] initialization error:", error);
      } finally {
        setReady(true);
      }
    };

    init();
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
        <div className="text-text-muted text-sm">Loading...</div>
      </div>
    );
  }

  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
}

export { msalInstance };
