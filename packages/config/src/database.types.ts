export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      analysis_jobs: {
        Row: {
          id: number
          user_id: string
          video_recording_id: number
          status: string
          progress_percentage: number
          summary_text: string | null
          full_feedback_text: string | null
          processing_time_ms: number | null
          video_source_type: string | null
          attempts: number
          last_error: string | null
          created_at: string
          updated_at: string
          processing_started_at: string | null
          processing_completed_at: string | null
        }
        Insert: {
          id?: number
          user_id: string
          video_recording_id: number
          status?: string
          progress_percentage?: number
          summary_text?: string | null
          full_feedback_text?: string | null
          processing_time_ms?: number | null
          video_source_type?: string | null
          attempts?: number
          last_error?: string | null
          created_at?: string
          updated_at?: string
          processing_started_at?: string | null
          processing_completed_at?: string | null
        }
        Update: {
          id?: number
          user_id?: string
          video_recording_id?: number
          status?: string
          progress_percentage?: number
          summary_text?: string | null
          full_feedback_text?: string | null
          processing_time_ms?: number | null
          video_source_type?: string | null
          attempts?: number
          last_error?: string | null
          created_at?: string
          updated_at?: string
          processing_started_at?: string | null
          processing_completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'analysis_jobs_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'analysis_jobs_video_recording_id_fkey'
            columns: ['video_recording_id']
            isOneToOne: false
            referencedRelation: 'video_recordings'
            referencedColumns: ['id']
          },
        ]
      }
      analysis_feedback: {
        Row: {
          id: number
          analysis_id: string
          message: string
          timestamp_seconds: number | null
          feedback_type: string | null
          ssml_status: string | null
          audio_status: string | null
          ssml_attempts: number
          audio_attempts: number
          ssml_last_error: string | null
          audio_last_error: string | null
          ssml_updated_at: string
          audio_updated_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          analysis_id: string
          message: string
          timestamp_seconds?: number | null
          feedback_type?: string | null
          ssml_status?: string | null
          audio_status?: string | null
          ssml_attempts?: number
          audio_attempts?: number
          ssml_last_error?: string | null
          audio_last_error?: string | null
          ssml_updated_at?: string
          audio_updated_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          analysis_id?: string
          message?: string
          timestamp_seconds?: number | null
          feedback_type?: string | null
          ssml_status?: string | null
          audio_status?: string | null
          ssml_attempts?: number
          audio_attempts?: number
          ssml_last_error?: string | null
          audio_last_error?: string | null
          ssml_updated_at?: string
          audio_updated_at?: string
          created_at?: string
          updated_at?: string
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
      analysis_ssml_segments: {
        Row: {
          id: number
          feedback_id: number
          segment_index: number
          ssml: string
          provider: string
          version: string | null
          created_at: string
        }
        Insert: {
          id?: number
          feedback_id: number
          segment_index?: number
          ssml: string
          provider?: string
          version?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          feedback_id?: number
          segment_index?: number
          ssml?: string
          provider?: string
          version?: string | null
          created_at?: string
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
      analysis_audio_segments: {
        Row: {
          id: number
          analysis_feedback_id: number
          segment_index: number
          audio_url: string | null
          duration_ms: number | null
          format: string | null
          provider: string
          version: string | null
          created_at: string
        }
        Insert: {
          id?: number
          analysis_feedback_id: number
          segment_index?: number
          audio_url?: string | null
          duration_ms?: number | null
          format?: string | null
          provider?: string
          version?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          analysis_feedback_id?: number
          segment_index?: number
          audio_url?: string | null
          duration_ms?: number | null
          format?: string | null
          provider?: string
          version?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'analysis_audio_segments_analysis_feedback_id_fkey'
            columns: ['analysis_feedback_id']
            isOneToOne: false
            referencedRelation: 'analysis_feedback'
            referencedColumns: ['id']
          },
        ]
      }
      ssml_jobs: {
        Row: {
          id: number
          feedback_id: number
          status: string
          attempts: number
          last_error: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          feedback_id: number
          status?: string
          attempts?: number
          last_error?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          feedback_id?: number
          status?: string
          attempts?: number
          last_error?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ssml_jobs_feedback_id_fkey'
            columns: ['feedback_id']
            isOneToOne: false
            referencedRelation: 'analysis_feedback'
            referencedColumns: ['id']
          },
        ]
      }
      video_recordings: {
        Row: {
          id: number
          user_id: string
          storage_path: string
          file_size: number | null
          duration_seconds: number | null
          format: string | null
          upload_status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          storage_path: string
          file_size?: number | null
          duration_seconds?: number | null
          format?: string | null
          upload_status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          storage_path?: string
          file_size?: number | null
          duration_seconds?: number | null
          format?: string | null
          upload_status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'video_recordings_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      analyses: {
        Row: {
          id: string
          job_id: number
          full_feedback_text: string | null
          summary_text: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_id: number
          full_feedback_text?: string | null
          summary_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_id?: number
          full_feedback_text?: string | null
          summary_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'analyses_job_id_fkey'
            columns: ['job_id']
            isOneToOne: false
            referencedRelation: 'analysis_jobs'
            referencedColumns: ['id']
          },
        ]
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

type PublicSchema = Database[Extract<keyof Database, 'public'>]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    ? (PublicSchema['Tables'] & PublicSchema['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends keyof PublicSchema['Tables'] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends keyof PublicSchema['Tables'] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends keyof PublicSchema['Enums'] | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
    ? PublicSchema['Enums'][PublicEnumNameOrOptions]
    : never
