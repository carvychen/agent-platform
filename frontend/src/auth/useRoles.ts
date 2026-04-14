import { useQuery } from "@tanstack/react-query";
import { useIsAuthenticated } from "@azure/msal-react";
import { getCurrentUser } from "../api/skillsApi";

export function useRoles() {
  const isAuthenticated = useIsAuthenticated();

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const roles = currentUser?.roles ?? [];

  return {
    isLoading,
    roles,
    isAdmin: roles.includes("SkillAdmin"),
    canWrite: roles.includes("SkillAdmin"),
    canRead: roles.includes("SkillAdmin") || roles.includes("SkillUser"),
    currentUser,
  };
}
