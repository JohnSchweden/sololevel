export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      analysis_jobs: {
        Row: {
          created_at: string
          error_message: string | null
          id: number
          pose_data: Json | null
          processing_completed_at: string | null
          processing_started_at: string | null
          progress_percentage: number | null
          results: Json | null
          status: string
          summary_text: string | null
          updated_at: string
          user_id: string
          video_recording_id: number
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: never
          pose_data?: Json | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          progress_percentage?: number | null
          results?: Json | null
          status?: string
          summary_text?: string | null
          updated_at?: string
          user_id: string
          video_recording_id: number
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: never
          pose_data?: Json | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          progress_percentage?: number | null
          results?: Json | null
          status?: string
          summary_text?: string | null
          updated_at?: string
          user_id?: string
          video_recording_id?: number
        }
        Relationships: [
          {
            foreignKeyName: 'analysis_jobs_video_recording_id_fkey'
            columns: ['video_recording_id']
            isOneToOne: false
            referencedRelation: 'video_recordings'
            referencedColumns: ['id']
          },
        ]
      }
      analysis_metrics: {
        Row: {
          analysis_id: number
          created_at: string
          id: number
          metric_key: string
          metric_value: number
          unit: string
          updated_at: string
        }
        Insert: {
          analysis_id: number
          created_at?: string
          id?: never
          metric_key: string
          metric_value: number
          unit: string
          updated_at?: string
        }
        Update: {
          analysis_id?: number
          created_at?: string
          id?: never
          metric_key?: string
          metric_value?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'analysis_metrics_analysis_id_fkey'
            columns: ['analysis_id']
            isOneToOne: false
            referencedRelation: 'analysis_jobs'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string | null
          id: number
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: never
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: never
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      upload_sessions: {
        Row: {
          bytes_uploaded: number | null
          chunk_size: number | null
          created_at: string
          expires_at: string
          id: number
          session_id: string
          signed_url: string
          status: string
          total_bytes: number
          updated_at: string
          user_id: string
          video_recording_id: number | null
        }
        Insert: {
          bytes_uploaded?: number | null
          chunk_size?: number | null
          created_at?: string
          expires_at: string
          id?: never
          session_id?: string
          signed_url: string
          status?: string
          total_bytes: number
          updated_at?: string
          user_id: string
          video_recording_id?: number | null
        }
        Update: {
          bytes_uploaded?: number | null
          chunk_size?: number | null
          created_at?: string
          expires_at?: string
          id?: never
          session_id?: string
          signed_url?: string
          status?: string
          total_bytes?: number
          updated_at?: string
          user_id?: string
          video_recording_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'upload_sessions_video_recording_id_fkey'
            columns: ['video_recording_id']
            isOneToOne: false
            referencedRelation: 'video_recordings'
            referencedColumns: ['id']
          },
        ]
      }
      video_recordings: {
        Row: {
          created_at: string
          duration_seconds: number
          file_size: number
          filename: string
          format: string
          id: number
          metadata: Json | null
          original_filename: string | null
          storage_path: string
          updated_at: string
          upload_progress: number | null
          upload_status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds: number
          file_size: number
          filename: string
          format: string
          id?: never
          metadata?: Json | null
          original_filename?: string | null
          storage_path: string
          updated_at?: string
          upload_progress?: number | null
          upload_status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          file_size?: number
          filename?: string
          format?: string
          id?: never
          metadata?: Json | null
          original_filename?: string | null
          storage_path?: string
          updated_at?: string
          upload_progress?: number | null
          upload_status?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_upload_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_analysis_with_metrics: {
        Args: { analysis_job_id: number }
        Returns: {
          analysis_id: number
          created_at: string
          metrics: Json
          progress_percentage: number
          status: string
          summary_text: string
          ssml_status: string
          audio_status: string
          updated_at: string
        }[]
      }
      get_upload_progress: {
        Args: { recording_id: number }
        Returns: {
          bytes_uploaded: number
          id: number
          progress_percentage: number
          total_bytes: number
          upload_status: string
        }[]
      }
      migrate_results_to_metrics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      store_analysis_results: {
        Args: {
          analysis_job_id: number
          p_metrics?: Json
          p_summary_text?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
