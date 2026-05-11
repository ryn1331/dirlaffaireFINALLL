import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = Record<string, string>;

export function useSiteSettings() {
  return useQuery({
    queryKey: ["site_settings"],
    queryFn: async (): Promise<SiteSettings> => {
      const { data, error } = await supabase
        .from("site_settings" as any)
        .select("key, value");
      if (error) throw error;
      const settings: SiteSettings = {};
      (data as any[])?.forEach((row: { key: string; value: string }) => {
        settings[row.key] = row.value;
      });
      return settings;
    },
    staleTime: 60_000,
  });
}
