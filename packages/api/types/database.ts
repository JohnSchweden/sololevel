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
      analyses: {
        Row: {
          created_at: string
          feedback_prompt: string | null
          full_feedback_json: Json | null
          full_feedback_text: string | null
          id: string
          job_id: number
          raw_generated_text: string | null
          summary_text: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          feedback_prompt?: string | null
          full_feedback_json?: Json | null
          full_feedback_text?: string | null
          id?: string
          job_id: number
          raw_generated_text?: string | null
          summary_text?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          feedback_prompt?: string | null
          full_feedback_json?: Json | null
          full_feedback_text?: string | null
          id?: string
          job_id?: number
          raw_generated_text?: string | null
          summary_text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'analyses_job_id_fkey'
            columns: ['job_id']
            isOneToOne: true
            referencedRelation: 'analysis_jobs'
            referencedColumns: ['id']
          },
        ]
      }
      analysis_audio_segments: {
        Row: {
          audio_url: string
          created_at: string
          duration_ms: number | null
          feedback_id: number
          format: string | null
          id: number
          prompt: string | null
          provider: string | null
          segment_index: number | null
          storage_path: string | null
          version: string | null
        }
        Insert: {
          audio_url: string
          created_at?: string
          duration_ms?: number | null
          feedback_id: number
          format?: string | null
          id?: never
          prompt?: string | null
          provider?: string | null
          segment_index?: number | null
          storage_path?: string | null
          version?: string | null
        }
        Update: {
          audio_url?: string
          created_at?: string
          duration_ms?: number | null
          feedback_id?: number
          format?: string | null
          id?: never
          prompt?: string | null
          provider?: string | null
          segment_index?: number | null
          storage_path?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'analysis_audio_segments_feedback_id_fkey'
            columns: ['feedback_id']
            isOneToOne: false
            referencedRelation: 'analysis_feedback'
            referencedColumns: ['id']
          },
        ]
      }
      analysis_feedback: {
        Row: {
          analysis_id: string
          audio_attempts: number
          audio_last_error: string | null
          audio_status: string | null
          audio_updated_at: string
          category: string
          confidence: number | null
          created_at: string
          id: number
          impact: number | null
          message: string
          ssml_attempts: number
          ssml_last_error: string | null
          ssml_status: string | null
          ssml_updated_at: string
          timestamp_seconds: number
        }
        Insert: {
          analysis_id: string
          audio_attempts?: number
          audio_last_error?: string | null
          audio_status?: string | null
          audio_updated_at?: string
          category: string
          confidence?: number | null
          created_at?: string
          id?: never
          impact?: number | null
          message: string
          ssml_attempts?: number
          ssml_last_error?: string | null
          ssml_status?: string | null
          ssml_updated_at?: string
          timestamp_seconds: number
        }
        Update: {
          analysis_id?: string
          audio_attempts?: number
          audio_last_error?: string | null
          audio_status?: string | null
          audio_updated_at?: string
          category?: string
          confidence?: number | null
          created_at?: string
          id?: never
          impact?: number | null
          message?: string
          ssml_attempts?: number
          ssml_last_error?: string | null
          ssml_status?: string | null
          ssml_updated_at?: string
          timestamp_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: 'analysis_feedback_analysis_id_fkey'
            columns: ['analysis_id']
            isOneToOne: false
            referencedRelation: 'analyses'
            referencedColumns: ['id']
          },
        ]
      }
      analysis_jobs: {
        Row: {
          created_at: string
          error_message: string | null
          id: number
          pose_data: Json | null
          processing_completed_at: string | null
          processing_started_at: string | null
          processing_time_ms: number | null
          progress_percentage: number | null
          results: Json | null
          status: string
          updated_at: string
          user_id: string
          video_recording_id: number
          video_source_type: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: never
          pose_data?: Json | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          processing_time_ms?: number | null
          progress_percentage?: number | null
          results?: Json | null
          status?: string
          updated_at?: string
          user_id: string
          video_recording_id: number
          video_source_type?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: never
          pose_data?: Json | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          processing_time_ms?: number | null
          progress_percentage?: number | null
          results?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
          video_recording_id?: number
          video_source_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'analysis_jobs_video_recording_id_fkey'
            columns: ['video_recording_id']
            isOneToOne: true
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
      analysis_ssml_segments: {
        Row: {
          created_at: string
          feedback_id: number
          id: number
          provider: string
          segment_index: number
          ssml: string
          ssml_prompt: string | null
          version: string | null
        }
        Insert: {
          created_at?: string
          feedback_id: number
          id?: number
          provider?: string
          segment_index?: number
          ssml: string
          ssml_prompt?: string | null
          version?: string | null
        }
        Update: {
          created_at?: string
          feedback_id?: number
          id?: number
          provider?: string
          segment_index?: number
          ssml?: string
          ssml_prompt?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'analysis_ssml_segments_feedback_id_fkey'
            columns: ['feedback_id']
            isOneToOne: false
            referencedRelation: 'analysis_feedback'
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
          thumbnail_url: string | null
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
          thumbnail_url?: string | null
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
          thumbnail_url?: string | null
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
      backfill_analyses_from_jobs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
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
          updated_at: string
        }[]
      }
      get_audio_segments_for_feedback: {
        Args: { feedback_item_id: number }
        Returns: {
          audio_url: string
          created_at: string
          duration_ms: number
          format: string
          id: number
          provider: string
          version: string
        }[]
      }
      get_complete_analysis: {
        Args: { p_job_id: number }
        Returns: {
          analysis_id: string
          audio_segments: Json
          feedback_prompt: string
          full_feedback_json: Json
          full_feedback_text: string
          job_progress_percentage: number
          job_status: string
          raw_generated_text: string
          summary_text: string
        }[]
      }
      get_enhanced_analysis_with_feedback: {
        Args: { analysis_job_id: number }
        Returns: {
          analyses: Json
          analysis_id: number
          created_at: string
          feedback: Json
          metrics: Json
          processing_time_ms: number
          progress_percentage: number
          status: string
          updated_at: string
          video_source_type: string
        }[]
      }
      get_feedback_with_audio: {
        Args: { analysis_job_id: number }
        Returns: {
          analysis_id: number
          audio_segments: Json
          category: string
          confidence: number
          feedback_created_at: string
          feedback_id: number
          impact: number
          message: string
          timestamp_seconds: number
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
      store_analysis_audio_segment: {
        Args: {
          p_analysis_id: string
          p_audio_url: string
          p_duration_ms?: number
          p_feedback_id: number
          p_format?: string
          p_provider?: string
          p_version?: string
        }
        Returns: number
      }
      store_analysis_results: {
        Args: {
          p_feedback_prompt?: string
          p_full_feedback_json?: Json
          p_full_feedback_text?: string
          p_job_id: number
          p_raw_generated_text?: string
          p_summary_text?: string
        }
        Returns: string
      }
      store_audio_segment: {
        Args: {
          p_analysis_feedback_id: number
          p_audio_url: string
          p_duration_ms?: number
          p_format?: string
          p_provider?: string
          p_version?: string
        }
        Returns: number
      }
      webhook_analysis_kickoff: {
        Args: { video_recording_id: number }
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
