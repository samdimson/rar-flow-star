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
      activities: {
        Row: {
          actor_id: string | null
          body: string | null
          created_at: string
          customer_id: string | null
          id: string
          lead_id: string | null
          occurred_at: string
          subject: string
          type: Database["public"]["Enums"]["activity_type"]
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          lead_id?: string | null
          occurred_at?: string
          subject: string
          type?: Database["public"]["Enums"]["activity_type"]
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          lead_id?: string | null
          occurred_at?: string
          subject?: string
          type?: Database["public"]["Enums"]["activity_type"]
        }
        Relationships: [
          {
            foreignKeyName: "activities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      appointment_notifications: {
        Row: {
          appointment_id: string | null
          created_at: string
          error_message: string | null
          id: string
          lead_id: string | null
          provider_message_id: string | null
          recipient_email: string
          recipient_name: string | null
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          provider_message_id?: string | null
          recipient_email: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          provider_message_id?: string | null
          recipient_email?: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_notifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_notifications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          assigned_to: string | null
          attendees: string | null
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          kind: Database["public"]["Enums"]["appointment_kind"]
          lead_id: string | null
          location: string | null
          notes: string | null
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          attendees?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["appointment_kind"]
          lead_id?: string | null
          location?: string | null
          notes?: string | null
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          attendees?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["appointment_kind"]
          lead_id?: string | null
          location?: string | null
          notes?: string | null
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          summary: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          summary?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          summary?: string | null
        }
        Relationships: []
      }
      change_orders: {
        Row: {
          amount: number
          created_at: string
          description: string
          homeowner_approved: boolean
          id: string
          lead_id: string
          production_job_id: string | null
          status: string
          supplement_submitted: boolean
        }
        Insert: {
          amount?: number
          created_at?: string
          description: string
          homeowner_approved?: boolean
          id?: string
          lead_id: string
          production_job_id?: string | null
          status?: string
          supplement_submitted?: boolean
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          homeowner_approved?: boolean
          id?: string
          lead_id?: string
          production_job_id?: string | null
          status?: string
          supplement_submitted?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "change_orders_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          applies_to_role: Database["public"]["Enums"]["app_role"]
          basis: string
          created_at: string
          flat_amount: number | null
          id: string
          is_active: boolean
          name: string
          percent: number
        }
        Insert: {
          applies_to_role?: Database["public"]["Enums"]["app_role"]
          basis?: string
          created_at?: string
          flat_amount?: number | null
          id?: string
          is_active?: boolean
          name: string
          percent?: number
        }
        Update: {
          applies_to_role?: Database["public"]["Enums"]["app_role"]
          basis?: string
          created_at?: string
          flat_amount?: number | null
          id?: string
          is_active?: boolean
          name?: string
          percent?: number
        }
        Relationships: []
      }
      commission_tiers: {
        Row: {
          id: number
          label: string
          max_closed: number | null
          min_closed: number
          rate: number
        }
        Insert: {
          id?: number
          label: string
          max_closed?: number | null
          min_closed: number
          rate: number
        }
        Update: {
          id?: number
          label?: string
          max_closed?: number | null
          min_closed?: number
          rate?: number
        }
        Relationships: []
      }
      commissions: {
        Row: {
          amount: number
          created_at: string
          id: string
          lead_id: string
          paid_at: string | null
          rep_id: string | null
          rule_id: string | null
          status: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          lead_id: string
          paid_at?: string | null
          rep_id?: string | null
          rule_id?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          lead_id?: string
          paid_at?: string | null
          rep_id?: string | null
          rule_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "commission_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string
          customer_id: string | null
          email: string | null
          id: string
          is_primary: boolean
          name: string
          phone: string | null
          relationship: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          phone?: string | null
          relationship?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          phone?: string | null
          relationship?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          contract_amount: number | null
          contract_type: string
          created_at: string
          customer_id: string | null
          direction_to_pay_signed: boolean
          id: string
          lead_id: string
          notes: string | null
          rescission_ends_at: string | null
          signed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          contract_amount?: number | null
          contract_type?: string
          created_at?: string
          customer_id?: string | null
          direction_to_pay_signed?: boolean
          id?: string
          lead_id: string
          notes?: string | null
          rescission_ends_at?: string | null
          signed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          contract_amount?: number | null
          contract_type?: string
          created_at?: string
          customer_id?: string | null
          direction_to_pay_signed?: boolean
          id?: string
          lead_id?: string
          notes?: string | null
          rescission_ends_at?: string | null
          signed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address_line1: string | null
          city: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          preferred_contact: string | null
          property_id: string | null
          secondary_phone: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          preferred_contact?: string | null
          property_id?: string | null
          secondary_phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          preferred_contact?: string | null
          property_id?: string | null
          secondary_phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          caption: string | null
          category: Database["public"]["Enums"]["document_category"]
          created_at: string
          customer_id: string | null
          file_name: string
          file_size: number | null
          id: string
          lead_id: string | null
          mime_type: string | null
          storage_path: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string
          customer_id?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          lead_id?: string | null
          mime_type?: string | null
          storage_path: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string
          customer_id?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          lead_id?: string | null
          mime_type?: string | null
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_line_items: {
        Row: {
          created_at: string
          estimate_id: string
          id: string
          item: string
          quantity: number
          sort_order: number
          source: string
          total: number | null
          unit: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          estimate_id: string
          id?: string
          item: string
          quantity?: number
          sort_order?: number
          source?: string
          total?: number | null
          unit?: string | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          estimate_id?: string
          id?: string
          item?: string
          quantity?: number
          sort_order?: number
          source?: string
          total?: number | null
          unit?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_line_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          created_at: string
          created_by: string | null
          estimate_number: string | null
          id: string
          labor_squares: number | null
          labor_type: string | null
          lead_id: string
          notes: string | null
          scope_gap_amount: number | null
          source: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          estimate_number?: string | null
          id?: string
          labor_squares?: number | null
          labor_type?: string | null
          lead_id: string
          notes?: string | null
          scope_gap_amount?: number | null
          source?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          estimate_number?: string | null
          id?: string
          labor_squares?: number | null
          labor_type?: string | null
          lead_id?: string
          notes?: string | null
          scope_gap_amount?: number | null
          source?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimates_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_claims: {
        Row: {
          acv_amount: number | null
          adjuster_email: string | null
          adjuster_meeting_at: string | null
          adjuster_name: string | null
          adjuster_phone: string | null
          adjuster_report_received_at: string | null
          carrier: string | null
          claim_number: string | null
          created_at: string
          date_filed: string | null
          date_of_loss: string | null
          deductible: number | null
          depreciation_amount: number | null
          depreciation_non_recoverable: number | null
          depreciation_recoverable: number | null
          depreciation_released_at: string | null
          id: string
          lead_id: string
          notes: string | null
          policy_details: string | null
          policy_number: string | null
          policy_summary: Json | null
          rcv_amount: number | null
          reinspection_at: string | null
          scope_document_id: string | null
          scope_summary: Json | null
          type_of_loss: string | null
          updated_at: string
        }
        Insert: {
          acv_amount?: number | null
          adjuster_email?: string | null
          adjuster_meeting_at?: string | null
          adjuster_name?: string | null
          adjuster_phone?: string | null
          adjuster_report_received_at?: string | null
          carrier?: string | null
          claim_number?: string | null
          created_at?: string
          date_filed?: string | null
          date_of_loss?: string | null
          deductible?: number | null
          depreciation_amount?: number | null
          depreciation_non_recoverable?: number | null
          depreciation_recoverable?: number | null
          depreciation_released_at?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          policy_details?: string | null
          policy_number?: string | null
          policy_summary?: Json | null
          rcv_amount?: number | null
          reinspection_at?: string | null
          scope_document_id?: string | null
          scope_summary?: Json | null
          type_of_loss?: string | null
          updated_at?: string
        }
        Update: {
          acv_amount?: number | null
          adjuster_email?: string | null
          adjuster_meeting_at?: string | null
          adjuster_name?: string | null
          adjuster_phone?: string | null
          adjuster_report_received_at?: string | null
          carrier?: string | null
          claim_number?: string | null
          created_at?: string
          date_filed?: string | null
          date_of_loss?: string | null
          deductible?: number | null
          depreciation_amount?: number | null
          depreciation_non_recoverable?: number | null
          depreciation_recoverable?: number | null
          depreciation_released_at?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          policy_details?: string | null
          policy_number?: string | null
          policy_summary?: Json | null
          rcv_amount?: number | null
          reinspection_at?: string | null
          scope_document_id?: string | null
          scope_summary?: Json | null
          type_of_loss?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_claims_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_scope_document_id_fkey"
            columns: ["scope_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          due_at: string | null
          id: string
          invoice_number: string | null
          issued_at: string | null
          lead_id: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          due_at?: string | null
          id?: string
          invoice_number?: string | null
          issued_at?: string | null
          lead_id: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_at?: string | null
          id?: string
          invoice_number?: string | null
          issued_at?: string | null
          lead_id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_stage_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_task_code: string | null
          id: string
          is_override: boolean
          lead_id: string
          reason: string | null
          to_task_code: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_task_code?: string | null
          id?: string
          is_override?: boolean
          lead_id: string
          reason?: string | null
          to_task_code: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_task_code?: string | null
          id?: string
          is_override?: boolean
          lead_id?: string
          reason?: string | null
          to_task_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_stage_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_rep_id: string | null
          closed_at: string | null
          contract_amount: number | null
          contract_signed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          estimated_value: number
          id: string
          inspection_date: string | null
          install_date: string | null
          lead_number: string
          net_amount: number | null
          next_follow_up_at: string | null
          notes: string | null
          overhead_amount: number | null
          production_manager_id: string | null
          property_id: string | null
          rescission_ends_at: string | null
          service_agreement_signed_at: string | null
          source: Database["public"]["Enums"]["lead_source"]
          source_detail: string | null
          stage_id: number
          status: Database["public"]["Enums"]["lead_status"]
          storm_date: string | null
          task_code: string
          updated_at: string
        }
        Insert: {
          assigned_rep_id?: string | null
          closed_at?: string | null
          contract_amount?: number | null
          contract_signed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          estimated_value?: number
          id?: string
          inspection_date?: string | null
          install_date?: string | null
          lead_number?: string
          net_amount?: number | null
          next_follow_up_at?: string | null
          notes?: string | null
          overhead_amount?: number | null
          production_manager_id?: string | null
          property_id?: string | null
          rescission_ends_at?: string | null
          service_agreement_signed_at?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          source_detail?: string | null
          stage_id?: number
          status?: Database["public"]["Enums"]["lead_status"]
          storm_date?: string | null
          task_code?: string
          updated_at?: string
        }
        Update: {
          assigned_rep_id?: string | null
          closed_at?: string | null
          contract_amount?: number | null
          contract_signed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          estimated_value?: number
          id?: string
          inspection_date?: string | null
          install_date?: string | null
          lead_number?: string
          net_amount?: number | null
          next_follow_up_at?: string | null
          notes?: string | null
          overhead_amount?: number | null
          production_manager_id?: string | null
          property_id?: string | null
          rescission_ends_at?: string | null
          service_agreement_signed_at?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          source_detail?: string | null
          stage_id?: number
          status?: Database["public"]["Enums"]["lead_status"]
          storm_date?: string | null
          task_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_task_code_fkey"
            columns: ["task_code"]
            isOneToOne: false
            referencedRelation: "pipeline_tasks"
            referencedColumns: ["code"]
          },
        ]
      }
      material_prices: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          unit: string | null
          unit_price: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          id?: string
          unit?: string | null
          unit_price?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          unit?: string | null
          unit_price?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      milestone_payouts: {
        Row: {
          amount: number
          created_at: string
          id: string
          lead_id: string
          milestone: number
          notes: string | null
          paid_at: string | null
          rep_id: string | null
          status: string
          triggered_at: string
          triggered_by_task: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          lead_id: string
          milestone: number
          notes?: string | null
          paid_at?: string | null
          rep_id?: string | null
          status?: string
          triggered_at?: string
          triggered_by_task?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          lead_id?: string
          milestone?: number
          notes?: string | null
          paid_at?: string | null
          rep_id?: string | null
          status?: string
          triggered_at?: string
          triggered_by_task?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestone_payouts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          lead_id: string | null
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          lead_id?: string | null
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          lead_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          lead_id: string | null
          message: string
          task_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          lead_id?: string | null
          message: string
          task_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          lead_id?: string | null
          message?: string
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string | null
          kind: Database["public"]["Enums"]["payment_kind"]
          lead_id: string
          method: string | null
          received_at: string | null
          reference: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string | null
          kind?: Database["public"]["Enums"]["payment_kind"]
          lead_id: string
          method?: string | null
          received_at?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string | null
          kind?: Database["public"]["Enums"]["payment_kind"]
          lead_id?: string
          method?: string | null
          received_at?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          id: number
          name: string
          sort_order: number
        }
        Insert: {
          id: number
          name: string
          sort_order: number
        }
        Update: {
          id?: number
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      pipeline_tasks: {
        Row: {
          code: string
          description: string
          is_terminal: boolean
          name: string
          required_fields: string[]
          sort_order: number
          stage_id: number
        }
        Insert: {
          code: string
          description: string
          is_terminal?: boolean
          name: string
          required_fields?: string[]
          sort_order: number
          stage_id: number
        }
        Update: {
          code?: string
          description?: string
          is_terminal?: boolean
          name?: string
          required_fields?: string[]
          sort_order?: number
          stage_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_tasks_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      production_jobs: {
        Row: {
          coc_emailed_at: string | null
          coc_signed_at: string | null
          created_at: string
          crew_name: string | null
          id: string
          install_date: string | null
          lead_id: string
          material_delivery_date: string | null
          material_order_status: string
          material_ordered_at: string | null
          notes: string | null
          permit_approved_at: string | null
          permit_status: string
          permit_submitted_at: string | null
          production_manager_id: string | null
          punch_list: string | null
          qc_passed_at: string | null
          rescheduled_to: string | null
          updated_at: string
          walkthrough_at: string | null
          warranty_registered_at: string | null
          weather_delay_notes: string | null
        }
        Insert: {
          coc_emailed_at?: string | null
          coc_signed_at?: string | null
          created_at?: string
          crew_name?: string | null
          id?: string
          install_date?: string | null
          lead_id: string
          material_delivery_date?: string | null
          material_order_status?: string
          material_ordered_at?: string | null
          notes?: string | null
          permit_approved_at?: string | null
          permit_status?: string
          permit_submitted_at?: string | null
          production_manager_id?: string | null
          punch_list?: string | null
          qc_passed_at?: string | null
          rescheduled_to?: string | null
          updated_at?: string
          walkthrough_at?: string | null
          warranty_registered_at?: string | null
          weather_delay_notes?: string | null
        }
        Update: {
          coc_emailed_at?: string | null
          coc_signed_at?: string | null
          created_at?: string
          crew_name?: string | null
          id?: string
          install_date?: string | null
          lead_id?: string
          material_delivery_date?: string | null
          material_order_status?: string
          material_ordered_at?: string | null
          notes?: string | null
          permit_approved_at?: string | null
          permit_status?: string
          permit_submitted_at?: string | null
          production_manager_id?: string | null
          punch_list?: string | null
          qc_passed_at?: string | null
          rescheduled_to?: string | null
          updated_at?: string
          walkthrough_at?: string | null
          warranty_registered_at?: string | null
          weather_delay_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_jobs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          job_title: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          is_active?: boolean
          job_title?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          job_title?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          created_at: string
          id: string
          jurisdiction: string | null
          notes: string | null
          postal_code: string
          property_type: Database["public"]["Enums"]["property_type"]
          roof_age: number | null
          roof_type: Database["public"]["Enums"]["roof_type"]
          state: string
          updated_at: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city?: string
          created_at?: string
          id?: string
          jurisdiction?: string | null
          notes?: string | null
          postal_code?: string
          property_type?: Database["public"]["Enums"]["property_type"]
          roof_age?: number | null
          roof_type?: Database["public"]["Enums"]["roof_type"]
          state?: string
          updated_at?: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          created_at?: string
          id?: string
          jurisdiction?: string | null
          notes?: string | null
          postal_code?: string
          property_type?: Database["public"]["Enums"]["property_type"]
          roof_age?: number | null
          roof_type?: Database["public"]["Enums"]["roof_type"]
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      supplements: {
        Row: {
          adjuster_email: string | null
          adjuster_name: string | null
          adjuster_phone: string | null
          appeal_outcome: string | null
          appeal_submitted_at: string | null
          approved_amount: number | null
          carrier_response_at: string | null
          code_upgrade_items: string | null
          created_at: string
          created_by: string | null
          denial_reason: string | null
          id: string
          lead_id: string
          line_items: string | null
          notes: string | null
          requested_amount: number | null
          scope_description: string | null
          status: string
          submitted_at: string | null
          supplement_number: number
          supporting_docs_notes: string | null
          updated_at: string
          xactimate_line_codes: string | null
        }
        Insert: {
          adjuster_email?: string | null
          adjuster_name?: string | null
          adjuster_phone?: string | null
          appeal_outcome?: string | null
          appeal_submitted_at?: string | null
          approved_amount?: number | null
          carrier_response_at?: string | null
          code_upgrade_items?: string | null
          created_at?: string
          created_by?: string | null
          denial_reason?: string | null
          id?: string
          lead_id: string
          line_items?: string | null
          notes?: string | null
          requested_amount?: number | null
          scope_description?: string | null
          status?: string
          submitted_at?: string | null
          supplement_number?: number
          supporting_docs_notes?: string | null
          updated_at?: string
          xactimate_line_codes?: string | null
        }
        Update: {
          adjuster_email?: string | null
          adjuster_name?: string | null
          adjuster_phone?: string | null
          appeal_outcome?: string | null
          appeal_submitted_at?: string | null
          approved_amount?: number | null
          carrier_response_at?: string | null
          code_upgrade_items?: string | null
          created_at?: string
          created_by?: string | null
          denial_reason?: string | null
          id?: string
          lead_id?: string
          line_items?: string | null
          notes?: string | null
          requested_amount?: number | null
          scope_description?: string | null
          status?: string
          submitted_at?: string | null
          supplement_number?: number
          supporting_docs_notes?: string | null
          updated_at?: string
          xactimate_line_codes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplements_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          auto_generated: boolean
          completed_at: string | null
          created_at: string
          created_by: string | null
          details: string | null
          due_at: string | null
          id: string
          kind: string
          lead_id: string | null
          priority: string
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          auto_generated?: boolean
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          details?: string | null
          due_at?: string | null
          id?: string
          kind?: string
          lead_id?: string | null
          priority?: string
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          auto_generated?: boolean
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          details?: string | null
          due_at?: string | null
          id?: string
          kind?: string
          lead_id?: string | null
          priority?: string
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
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
      [_ in never]: never
    }
    Functions: {
      calc_lead_gross_after_costs: {
        Args: { _contract_amount: number; _lead_id: string }
        Returns: number
      }
      calc_lead_net_amount: {
        Args: { _contract_amount: number; _lead_id: string }
        Returns: number
      }
      calc_lead_overhead_amount: {
        Args: { _contract_amount: number; _lead_id: string }
        Returns: number
      }
      can_edit: { Args: never; Returns: boolean }
      can_manage: { Args: never; Returns: boolean }
      can_view_all_leads: { Args: never; Returns: boolean }
      can_view_finance: { Args: never; Returns: boolean }
      get_dashboard_stats: { Args: never; Returns: Json }
      get_rep_commission: {
        Args: { rep_id: string }
        Returns: {
          commission_amount: number
          lifetime_closed: number
          milestone_1_payout: number
          milestone_2_payout: number
          milestone_3_payout: number
          next_tier_label: string
          next_tier_min: number
          tier_label: string
          tier_rate: number
          total_net: number
        }[]
      }
      get_rep_tier_rate: { Args: { _rep_id: string }; Returns: number }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      owns_customer: { Args: { _customer_id: string }; Returns: boolean }
      owns_lead: { Args: { _lead_id: string }; Returns: boolean }
      owns_property: { Args: { _property_id: string }; Returns: boolean }
    }
    Enums: {
      activity_type:
        | "call"
        | "email"
        | "sms"
        | "meeting"
        | "note"
        | "stage_change"
        | "document"
        | "appointment"
        | "task"
        | "system"
        | "coc_emailed"
      app_role:
        | "admin"
        | "owner_manager"
        | "sales_rep"
        | "production_manager"
        | "office_admin"
        | "viewer"
      appointment_kind:
        | "inspection"
        | "adjuster_meeting"
        | "production"
        | "walkthrough"
        | "follow_up"
        | "other"
      document_category:
        | "photo"
        | "adjuster_report"
        | "insurance_scope"
        | "xactimate_estimate"
        | "supplement"
        | "contract"
        | "direction_to_pay"
        | "permit"
        | "invoice"
        | "certificate_of_completion"
        | "warranty"
        | "other"
        | "coc"
        | "service_agreement"
      lead_source:
        | "door_to_door"
        | "website"
        | "phone"
        | "referral"
        | "insurance"
        | "facebook_google"
        | "other"
      lead_status: "open" | "won" | "lost" | "nurture"
      payment_kind:
        | "deductible"
        | "acv"
        | "depreciation"
        | "supplement"
        | "other"
      property_type:
        | "residential_single"
        | "residential_multi"
        | "condo"
        | "mobile"
        | "commercial_flat"
        | "commercial_low"
        | "commercial_steep"
        | "industrial"
        | "church"
        | "other"
      roof_type:
        | "asphalt_shingle"
        | "metal"
        | "tile"
        | "flat_tpo"
        | "flat_epdm"
        | "flat_mod"
        | "wood_shake"
        | "slate"
        | "other"
      task_status: "open" | "completed" | "cancelled"
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
      activity_type: [
        "call",
        "email",
        "sms",
        "meeting",
        "note",
        "stage_change",
        "document",
        "appointment",
        "task",
        "system",
        "coc_emailed",
      ],
      app_role: [
        "admin",
        "owner_manager",
        "sales_rep",
        "production_manager",
        "office_admin",
        "viewer",
      ],
      appointment_kind: [
        "inspection",
        "adjuster_meeting",
        "production",
        "walkthrough",
        "follow_up",
        "other",
      ],
      document_category: [
        "photo",
        "adjuster_report",
        "insurance_scope",
        "xactimate_estimate",
        "supplement",
        "contract",
        "direction_to_pay",
        "permit",
        "invoice",
        "certificate_of_completion",
        "warranty",
        "other",
        "coc",
        "service_agreement",
      ],
      lead_source: [
        "door_to_door",
        "website",
        "phone",
        "referral",
        "insurance",
        "facebook_google",
        "other",
      ],
      lead_status: ["open", "won", "lost", "nurture"],
      payment_kind: [
        "deductible",
        "acv",
        "depreciation",
        "supplement",
        "other",
      ],
      property_type: [
        "residential_single",
        "residential_multi",
        "condo",
        "mobile",
        "commercial_flat",
        "commercial_low",
        "commercial_steep",
        "industrial",
        "church",
        "other",
      ],
      roof_type: [
        "asphalt_shingle",
        "metal",
        "tile",
        "flat_tpo",
        "flat_epdm",
        "flat_mod",
        "wood_shake",
        "slate",
        "other",
      ],
      task_status: ["open", "completed", "cancelled"],
    },
  },
} as const
