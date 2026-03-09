import useSWR from "swr";
import { fetcher } from "@/app/lib/fetchers";

export function useUserProfile(session: { user?: { email?: string | null } } | null) {
  const { data: userProfileData } = useSWR(
    session ? "/api/profile" : null,
    fetcher
  );

  const penName: string = userProfileData?.penName || "";
  const userIcon: string | null = userProfileData?.userIcon || null;

  return { penName, userIcon };
}
