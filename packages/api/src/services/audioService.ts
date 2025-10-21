import { log } from '@my/logging'

import { supabase } from '../supabase'
import { createSignedDownloadUrl } from './storageService'

type AudioSegmentRow = {
  audio_url: string
  storage_path: string | null
}

const castedSupabase = supabase as unknown as {
  rpc: (
    fn: string,
    args: { feedback_item_id: number }
  ) => Promise<{
    data: { audio_url?: string; storage_path?: string | null }[]
    error: { message: string } | null
  }>
  from: (relation: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: number
      ) => {
        order: (
          column: string,
          options: { ascending: boolean }
        ) => {
          limit: (count: number) => {
            maybeSingle: <T>() => Promise<{ data: T | null; error: { message: string } | null }>
          }
        }
      }
    }
  }
}

export type AudioUrlResult =
  | {
      ok: true
      url: string
    }
  | {
      ok: false
      error: string
    }

const CONTEXT = 'audioService.getFirstAudioUrlForFeedback'

export async function getFirstAudioUrlForFeedback(feedbackId: number): Promise<AudioUrlResult> {
  try {
    const { data: rpcData, error: rpcError } = await castedSupabase.rpc(
      'get_audio_segments_for_feedback',
      {
        feedback_item_id: feedbackId,
      }
    )

    if (rpcError) {
      const normalizedMessage = rpcError.message?.toLowerCase() ?? ''

      // Temporary migration bridge: older RPC references analysis_feedback_id column
      if (normalizedMessage.includes('analysis_feedback_id')) {
        log.warn(CONTEXT, 'RPC column mismatch, falling back to direct query', {
          feedbackId,
          error: rpcError.message,
        })
      } else {
        log.error(CONTEXT, 'RPC failed', { feedbackId, error: rpcError.message })
        return {
          ok: false,
          error: rpcError.message,
        }
      }
    }

    const rpcFirst = Array.isArray(rpcData)
      ? (rpcData as Array<{ audio_url?: string; storage_path?: string | null }>).find(
          (segment) => !!(segment.storage_path || segment.audio_url)
        )
      : undefined
    if (rpcFirst) {
      // Prefer storage_path, fallback to audio_url
      if (rpcFirst.storage_path) {
        log.info(CONTEXT, 'Generating signed URL from storage_path (RPC)', {
          feedbackId,
          storagePath: rpcFirst.storage_path,
        })
        const result = await createSignedDownloadUrl('processed', rpcFirst.storage_path)
        if (result.data) {
          return {
            ok: true,
            url: result.data.signedUrl,
          }
        }
        log.warn(CONTEXT, 'Failed to generate signed URL, falling back to audio_url', {
          feedbackId,
          error: result.error,
          storagePath: rpcFirst.storage_path,
        })
      }
      if (rpcFirst.audio_url) {
        log.info(CONTEXT, 'Using legacy audio_url (RPC)', { feedbackId })
        return {
          ok: true,
          url: rpcFirst.audio_url,
        }
      }
    }

    const { data: row, error: queryError } = await castedSupabase
      .from('analysis_audio_segments')
      .select('audio_url, storage_path')
      .eq('feedback_id', feedbackId)
      .order('segment_index', { ascending: true })
      .limit(1)
      .maybeSingle<AudioSegmentRow>()

    if (queryError) {
      log.error(CONTEXT, 'Fallback query failed', { feedbackId, error: queryError.message })
      return {
        ok: false,
        error: queryError.message,
      }
    }

    if (row) {
      // Prefer storage_path, fallback to audio_url
      if (row.storage_path) {
        log.info(CONTEXT, 'Generating signed URL from storage_path (direct query)', {
          feedbackId,
          storagePath: row.storage_path,
        })
        const result = await createSignedDownloadUrl('processed', row.storage_path)
        if (result.data) {
          return {
            ok: true,
            url: result.data.signedUrl,
          }
        }
        log.warn(CONTEXT, 'Failed to generate signed URL, falling back to audio_url', {
          feedbackId,
          error: result.error,
          storagePath: row.storage_path,
        })
      }
      if (row.audio_url) {
        log.info(CONTEXT, 'Using legacy audio_url (direct query)', { feedbackId })
        return {
          ok: true,
          url: row.audio_url,
        }
      }
    }

    log.debug(CONTEXT, 'Audio url not available yet', { feedbackId })
    return {
      ok: false,
      error: 'Audio feedback not available yet.',
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    log.error(CONTEXT, 'Unexpected error', { feedbackId, error: message })
    return {
      ok: false,
      error: message,
    }
  }
}
