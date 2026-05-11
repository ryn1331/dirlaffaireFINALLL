export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          orders_count: number | null
          phone: string
          total_spent: number | null
          updated_at: string
          wilaya: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          orders_count?: number | null
          phone: string
          total_spent?: number | null
          updated_at?: string
          wilaya?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          orders_count?: number | null
          phone?: string
          total_spent?: number | null
          updated_at?: string
          wilaya?: string | null
        }
        Relationships: []
      }
      delivery_zones: {
        Row: {
          code: string
          created_at: string
          has_yalidine: boolean
          has_zr_express: boolean
          id: string
          name: string
          remote_price: number
          updated_at: string
          yalidine_bureau_price: number
          yalidine_domicile_price: number
          zr_bureau_price: number
          zr_domicile_price: number
        }
        Insert: {
          code: string
          created_at?: string
          has_yalidine?: boolean
          has_zr_express?: boolean
          id?: string
          name: string
          remote_price?: number
          updated_at?: string
          yalidine_bureau_price?: number
          yalidine_domicile_price?: number
          zr_bureau_price?: number
          zr_domicile_price?: number
        }
        Update: {
          code?: string
          created_at?: string
          has_yalidine?: boolean
          has_zr_express?: boolean
          id?: string
          name?: string
          remote_price?: number
          updated_at?: string
          yalidine_bureau_price?: number
          yalidine_domicile_price?: number
          zr_bureau_price?: number
          zr_domicile_price?: number
        }
        Relationships: []
      }
      order_items: {
        Row: {
          flavor: string | null
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
          weight: string | null
        }
        Insert: {
          flavor?: string | null
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          total_price: number
          unit_price: number
          weight?: string | null
        }
        Update: {
          flavor?: string | null
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          total_price?: number
          unit_price?: number
          weight?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string
          client_name: string
          client_phone: string
          commune: string
          created_at: string
          delivery_fee: number | null
          delivery_type: string
          id: string
          notes: string | null
          order_number: string
          service_livraison: string | null
          shipping_created_at: string | null
          shipping_error: string | null
          shipping_label_url: string | null
          status: string
          subtotal: number
          total: number
          tracking_number: string | null
          updated_at: string
          wilaya: string
        }
        Insert: {
          address: string
          client_name: string
          client_phone: string
          commune: string
          created_at?: string
          delivery_fee?: number | null
          delivery_type?: string
          id?: string
          notes?: string | null
          order_number: string
          service_livraison?: string | null
          shipping_created_at?: string | null
          shipping_error?: string | null
          shipping_label_url?: string | null
          status?: string
          subtotal: number
          total: number
          tracking_number?: string | null
          updated_at?: string
          wilaya: string
        }
        Update: {
          address?: string
          client_name?: string
          client_phone?: string
          commune?: string
          created_at?: string
          delivery_fee?: number | null
          delivery_type?: string
          id?: string
          notes?: string | null
          order_number?: string
          service_livraison?: string | null
          shipping_created_at?: string | null
          shipping_error?: string | null
          shipping_label_url?: string | null
          status?: string
          subtotal?: number
          total?: number
          tracking_number?: string | null
          updated_at?: string
          wilaya?: string
        }
        Relationships: []
      }
      pack_items: {
        Row: {
          id: string
          pack_id: string
          product_name: string
          quantity: number | null
        }
        Insert: {
          id?: string
          pack_id: string
          product_name: string
          quantity?: number | null
        }
        Update: {
          id?: string
          pack_id?: string
          product_name?: string
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pack_items_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "packs"
            referencedColumns: ["id"]
          },
        ]
      }
      packs: {
        Row: {
          active: boolean | null
          created_at: string
          description: string | null
          duration: string | null
          id: string
          image_url: string | null
          name: string
          old_price: number | null
          price: number
          stock_qty: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          image_url?: string | null
          name: string
          old_price?: number | null
          price: number
          stock_qty?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          image_url?: string | null
          name?: string
          old_price?: number | null
          price?: number
          stock_qty?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          brand: string
          category: string
          conseils: string | null
          cost_price: number | null
          created_at: string
          description: string | null
          expiration_date: string | null
          flavors: string[] | null
          gallery: string[] | null
          id: string
          image_url: string | null
          in_stock: boolean | null
          is_promo: boolean | null
          is_top_sale: boolean | null
          name: string
          nutrition_facts: Json | null
          objectives: string[] | null
          old_price: number | null
          price: number
          rating: number | null
          reviews_count: number | null
          stock_qty: number | null
          updated_at: string
          usage_instructions: string | null
          weights: string[] | null
        }
        Insert: {
          brand: string
          category: string
          conseils?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          expiration_date?: string | null
          flavors?: string[] | null
          gallery?: string[] | null
          id?: string
          image_url?: string | null
          in_stock?: boolean | null
          is_promo?: boolean | null
          is_top_sale?: boolean | null
          name: string
          nutrition_facts?: Json | null
          objectives?: string[] | null
          old_price?: number | null
          price: number
          rating?: number | null
          reviews_count?: number | null
          stock_qty?: number | null
          updated_at?: string
          usage_instructions?: string | null
          weights?: string[] | null
        }
        Update: {
          brand?: string
          category?: string
          conseils?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          expiration_date?: string | null
          flavors?: string[] | null
          gallery?: string[] | null
          id?: string
          image_url?: string | null
          in_stock?: boolean | null
          is_promo?: boolean | null
          is_top_sale?: boolean | null
          name?: string
          nutrition_facts?: Json | null
          objectives?: string[] | null
          old_price?: number | null
          price?: number
          rating?: number | null
          reviews_count?: number | null
          stock_qty?: number | null
          updated_at?: string
          usage_instructions?: string | null
          weights?: string[] | null
        }
        Relationships: []
      }
      promos: {
        Row: {
          active: boolean | null
          apply_to: string
          created_at: string
          discount: number
          discount_type: string
          end_date: string | null
          id: string
          name: string
          product_ids: string[] | null
          products_count: number | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          apply_to?: string
          created_at?: string
          discount: number
          discount_type?: string
          end_date?: string | null
          id?: string
          name: string
          product_ids?: string[] | null
          products_count?: number | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          apply_to?: string
          created_at?: string
          discount?: number
          discount_type?: string
          end_date?: string | null
          id?: string
          name?: string
          product_ids?: string[] | null
          products_count?: number | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      products_public: {
        Row: {
          brand: string | null
          category: string | null
          conseils: string | null
          created_at: string | null
          description: string | null
          expiration_date: string | null
          flavors: string[] | null
          gallery: string[] | null
          id: string | null
          image_url: string | null
          in_stock: boolean | null
          is_promo: boolean | null
          is_top_sale: boolean | null
          name: string | null
          nutrition_facts: Json | null
          objectives: string[] | null
          old_price: number | null
          price: number | null
          rating: number | null
          reviews_count: number | null
          stock_qty: number | null
          updated_at: string | null
          usage_instructions: string | null
          weights: string[] | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          conseils?: string | null
          created_at?: string | null
          description?: string | null
          expiration_date?: string | null
          flavors?: string[] | null
          gallery?: string[] | null
          id?: string | null
          image_url?: string | null
          in_stock?: boolean | null
          is_promo?: boolean | null
          is_top_sale?: boolean | null
          name?: string | null
          nutrition_facts?: Json | null
          objectives?: string[] | null
          old_price?: number | null
          price?: number | null
          rating?: number | null
          reviews_count?: number | null
          stock_qty?: number | null
          updated_at?: string | null
          usage_instructions?: string | null
          weights?: string[] | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          conseils?: string | null
          created_at?: string | null
          description?: string | null
          expiration_date?: string | null
          flavors?: string[] | null
          gallery?: string[] | null
          id?: string | null
          image_url?: string | null
          in_stock?: boolean | null
          is_promo?: boolean | null
          is_top_sale?: boolean | null
          name?: string | null
          nutrition_facts?: Json | null
          objectives?: string[] | null
          old_price?: number | null
          price?: number | null
          rating?: number | null
          reviews_count?: number | null
          stock_qty?: number | null
          updated_at?: string | null
          usage_instructions?: string | null
          weights?: string[] | null
        }
        Relationships: []
      }
    }
    Functions: {
      decrement_stock: {
        Args: { p_product_id: string; p_quantity: number }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
