import {useAuth} from "@clerk/react";
import {useGetMe} from "@workspace/api-client-react";

export function useAdminIdentity() {
  const {isLoaded, isSignedIn, userId} = useAuth();
  const identity = useGetMe({
    query: {
      queryKey: ["admin-identity", userId],
      enabled: isLoaded && !!isSignedIn,
      retry: false,
      staleTime: 0,
      refetchOnMount: "always",
      refetchOnWindowFocus: true,
      refetchInterval: 15_000,
    },
  });
  return {isLoaded, isSignedIn, userId, identity};
}
