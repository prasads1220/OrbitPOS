export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          email: string | null
          role: 'admin' | 'cashier' | 'employee' | 'super_admin'
          hourly_rate: number
          created_at: string
          updated_at: string
          store_id: string | null
          company_id: string | null
        }
        Insert: {
          id: string
          full_name?: string | null
          email?: string | null
          role?: 'admin' | 'cashier' | 'employee' | 'super_admin'
          hourly_rate?: number
          created_at?: string
          updated_at?: string
          store_id?: string | null
          company_id?: string | null
        }
        Update: {
          id?: string
          full_name?: string | null
          email?: string | null
          role?: 'admin' | 'cashier' | 'employee' | 'super_admin'
          hourly_rate?: number
          created_at?: string
          updated_at?: string
          store_id?: string | null
          company_id?: string | null
        }
      }
      companies: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      stores: {
        Row: {
          id: string
          name: string
          company_id: string | null
          branding_logo: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          company_id?: string | null
          branding_logo?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          company_id?: string | null
          branding_logo?: string | null
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          sku: string
          barcode: string | null
          description: string | null
          price: number
          cost_price: number | null
          stock_quantity: number
          low_stock_threshold: number
          category_id: string | null
          image_url: string | null
          is_active: boolean
          vendor_name: string | null
          brand_name: string | null
          color: string | null
          model: string | null
          product_type: 'gadget' | 'non-gadget' | null
          created_at: string
          updated_at: string
          store_id: string | null
        }
        Insert: {
          id?: string
          name: string
          sku: string
          barcode?: string | null
          description?: string | null
          price: number
          cost_price?: number | null
          stock_quantity?: number
          low_stock_threshold?: number
          category_id?: string | null
          image_url?: string | null
          is_active?: boolean
          vendor_name?: string | null
          brand_name?: string | null
          color?: string | null
          model?: string | null
          product_type?: 'gadget' | 'non-gadget' | null
          created_at?: string
          updated_at?: string
          store_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          sku?: string
          barcode?: string | null
          description?: string | null
          price?: number
          cost_price?: number | null
          stock_quantity?: number
          low_stock_threshold?: number
          category_id?: string | null
          image_url?: string | null
          is_active?: boolean
          vendor_name?: string | null
          brand_name?: string | null
          color?: string | null
          model?: string | null
          product_type?: 'gadget' | 'non-gadget' | null
          created_at?: string
          updated_at?: string
          store_id?: string | null
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          order_number: number
          customer_id: string | null
          cashier_id: string | null
          total_amount: number
          tax_amount: number
          discount_amount: number
          payment_method: string | null
          payment_status: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_number?: number
          customer_id?: string | null
          cashier_id?: string | null
          total_amount: number
          tax_amount?: number
          discount_amount?: number
          payment_method?: string | null
          payment_status?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_number?: number
          customer_id?: string | null
          cashier_id?: string | null
          total_amount?: number
          tax_amount?: number
          discount_amount?: number
          payment_method?: string | null
          payment_status?: string | null
          created_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          quantity: number
          unit_price: number
          total_price: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          quantity: number
          unit_price: number
          total_price: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          unit_price?: number
          total_price?: number
          created_at?: string
        }
      }
      attendance: {
        Row: {
          id: string
          employee_id: string
          clock_in: string
          clock_out: string | null
          total_hours: number | null
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          clock_in?: string
          clock_out?: string | null
          total_hours?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          clock_in?: string
          clock_out?: string | null
          total_hours?: number | null
          created_at?: string
        }
      }
      payroll: {
        Row: {
          id: string
          employee_id: string
          period_start: string
          period_end: string
          total_hours: number
          gross_pay: number
          status: string
          paid_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          period_start: string
          period_end: string
          total_hours: number
          gross_pay: number
          status?: string
          paid_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          period_start?: string
          period_end?: string
          total_hours?: number
          gross_pay?: number
          status?: string
          paid_at?: string | null
          created_at?: string
        }
      }
      inventory_logs: {
        Row: {
          id: string
          product_id: string | null
          change_amount: number
          reason: string | null
          performed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id?: string | null
          change_amount: number
          reason?: string | null
          performed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string | null
          change_amount?: number
          reason?: string | null
          performed_by?: string | null
          created_at?: string
        }
      }
      settings: {
        Row: {
          id: number
          store_name: string
          store_email: string | null
          store_phone: string | null
          currency: string
          tax_rate: number
          receipt_header: string | null
          receipt_footer: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          store_name?: string
          store_email?: string | null
          store_phone?: string | null
          currency?: string
          tax_rate?: number
          receipt_header?: string | null
          receipt_footer?: string | null
          updated_at?: string
        }
        Update: {
          id?: number
          store_name?: string
          store_email?: string | null
          store_phone?: string | null
          currency?: string
          tax_rate?: number
          receipt_header?: string | null
          receipt_footer?: string | null
          updated_at?: string
        }
      }
      vendor_invoices: {
        Row: {
          id: string
          vendor_name: string
          invoice_url: string
          store_id: string | null
          invoice_date: string
          created_at: string
        }
        Insert: {
          id?: string
          vendor_name: string
          invoice_url: string
          store_id?: string | null
          invoice_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          vendor_name?: string
          invoice_url?: string
          store_id?: string | null
          invoice_date?: string
          created_at?: string
        }
      }
      stock_transfers: {
        Row: {
          id: string
          source_store_id: string
          target_store_id: string
          items: Json
          status: 'pending' | 'confirmed' | 'cancelled'
          created_at: string
          confirmed_at: string | null
          confirmed_by: string | null
        }
        Insert: {
          id?: string
          source_store_id: string
          target_store_id: string
          items: Json
          status?: 'pending' | 'confirmed' | 'cancelled'
          created_at?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
        }
        Update: {
          id?: string
          source_store_id?: string
          target_store_id?: string
          items?: Json
          status?: 'pending' | 'confirmed' | 'cancelled'
          created_at?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
