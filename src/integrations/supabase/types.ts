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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          log_type: Database["public"]["Enums"]["log_type"]
          ra: string | null
          student_name: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          log_type: Database["public"]["Enums"]["log_type"]
          ra?: string | null
          student_name?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          log_type?: Database["public"]["Enums"]["log_type"]
          ra?: string | null
          student_name?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          created_at: string
          hint_level: Database["public"]["Enums"]["ai_hint_level"]
          id: string
          role: Database["public"]["Enums"]["ai_message_role"]
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          hint_level?: Database["public"]["Enums"]["ai_hint_level"]
          id?: string
          role: Database["public"]["Enums"]["ai_message_role"]
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          hint_level?: Database["public"]["Enums"]["ai_hint_level"]
          id?: string
          role?: Database["public"]["Enums"]["ai_message_role"]
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          hint_level: number
          id: string
          message_count: number
          min_time_passed: boolean
          quiz_attempts: number
          quiz_passed: boolean
          ra: string
          required_minutes: number
          score: number | null
          started_at: string
          status: Database["public"]["Enums"]["ai_session_status"]
          student_name: string | null
          task_content: string | null
          task_id: string
          task_title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          hint_level?: number
          id?: string
          message_count?: number
          min_time_passed?: boolean
          quiz_attempts?: number
          quiz_passed?: boolean
          ra: string
          required_minutes?: number
          score?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["ai_session_status"]
          student_name?: string | null
          task_content?: string | null
          task_id: string
          task_title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          hint_level?: number
          id?: string
          message_count?: number
          min_time_passed?: boolean
          quiz_attempts?: number
          quiz_passed?: boolean
          ra?: string
          required_minutes?: number
          score?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["ai_session_status"]
          student_name?: string | null
          task_content?: string | null
          task_id?: string
          task_title?: string
          updated_at?: string
        }
        Relationships: []
      }
      banned_students: {
        Row: {
          banned_at: string
          banned_by: string | null
          id: string
          ra: string
          reason: string
          student_name: string | null
        }
        Insert: {
          banned_at?: string
          banned_by?: string | null
          id?: string
          ra: string
          reason: string
          student_name?: string | null
        }
        Update: {
          banned_at?: string
          banned_by?: string | null
          id?: string
          ra?: string
          reason?: string
          student_name?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      student_accounts: {
        Row: {
          created_at: string
          id: string
          ra: string
          student_name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ra: string
          student_name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ra?: string
          student_name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      student_warnings: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          id: string
          ra: string
          reason: string
          student_name: string | null
          warned_at: string
          warned_by: string | null
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          id?: string
          ra: string
          reason: string
          student_name?: string | null
          warned_at?: string
          warned_by?: string | null
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          id?: string
          ra?: string
          reason?: string
          student_name?: string | null
          warned_at?: string
          warned_by?: string | null
        }
        Relationships: []
      }
      task_results: {
        Row: {
          created_at: string
          id: string
          ra: string
          room: string | null
          score: number | null
          success: boolean | null
          task_id: string
          time_spent: number | null
          title: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ra: string
          room?: string | null
          score?: number | null
          success?: boolean | null
          task_id: string
          time_spent?: number | null
          title?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ra?: string
          room?: string | null
          score?: number | null
          success?: boolean | null
          task_id?: string
          time_spent?: number | null
          title?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      acknowledge_warning: {
        Args: { student_ra: string; warning_id: string }
        Returns: boolean
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
      ai_hint_level: "none" | "light" | "medium" | "deep"
      ai_message_role: "user" | "assistant" | "system"
      ai_session_status: "active" | "completed" | "abandoned"
      app_role: "admin" | "user"
      log_type:
        | "login"
        | "task_completed"
        | "task_failed"
        | "inspect_attempt"
        | "ban_attempt"
        | "error"
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
      ai_hint_level: ["none", "light", "medium", "deep"],
      ai_message_role: ["user", "assistant", "system"],
      ai_session_status: ["active", "completed", "abandoned"],
      app_role: ["admin", "user"],
      log_type: [
        "login",
        "task_completed",
        "task_failed",
        "inspect_attempt",
        "ban_attempt",
        "error",
      ],
    },
  },
} as const
