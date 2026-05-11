import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DeliveryZone {
  id: string;
  code: string;
  name: string;
  has_zr_express: boolean;
  has_yalidine: boolean;
  yalidine_bureau_price: number;
  yalidine_domicile_price: number;
  zr_bureau_price: number;
  zr_domicile_price: number;
  remote_price: number;
}

export interface DeliveryOption {
  id: string;
  label: string;
  company: string;
  type: "bureau" | "domicile";
  price: number;
}

export function useDeliveryZones() {
  return useQuery({
    queryKey: ["delivery_zones"],
    queryFn: async (): Promise<DeliveryZone[]> => {
      const { data, error } = await supabase
        .from("delivery_zones")
        .select("*")
        .order("code");
      if (error) throw error;
      return (data as DeliveryZone[]) || [];
    },
    staleTime: 10 * 60_000,
  });
}

export function getDeliveryOptionsFromZone(zone: DeliveryZone): DeliveryOption[] {
  const options: DeliveryOption[] = [];

  if (zone.has_yalidine) {
    options.push(
      { id: "yalidine_bureau", label: "Bureau Yalidine", company: "Yalidine", type: "bureau", price: zone.yalidine_bureau_price },
      { id: "yalidine_domicile", label: "Domicile Yalidine", company: "Yalidine", type: "domicile", price: zone.yalidine_domicile_price },
    );
  }

  if (zone.has_zr_express) {
    options.push(
      { id: "zr_bureau", label: "Bureau ZR Express", company: "ZR Express", type: "bureau", price: zone.zr_bureau_price },
      { id: "zr_domicile", label: "Domicile ZR Express", company: "ZR Express", type: "domicile", price: zone.zr_domicile_price },
    );
  }

  if (!zone.has_zr_express && !zone.has_yalidine) {
    options.push(
      { id: "zr_domicile_remote", label: "Domicile ZR Express (zone éloignée)", company: "ZR Express", type: "domicile", price: zone.remote_price },
    );
  }

  return options;
}
