/**
 * Hook that periodically checks GitHub for a newer release.
 */

import { useQuery } from "@tanstack/react-query";
import { APP_VERSION, fetchLatestRelease, isNewer } from "@/lib/version";

export function useVersionCheck() {
  return useQuery({
    queryKey: ["latest-release"],
    queryFn: async () => {
      const release = await fetchLatestRelease();
      if (!release) return { hasUpdate: false, latestVersion: null as string | null };
      const latest = release.tag_name.replace(/^v/, "");
      return {
        hasUpdate: isNewer(release.tag_name, APP_VERSION),
        latestVersion: latest,
        htmlUrl: release.html_url,
      };
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
  });
}
