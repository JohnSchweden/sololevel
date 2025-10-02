import { describe, expect, it, vi } from 'vitest'

import { getFirstAudioUrlForFeedback } from '../audioService'

import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('@my/logging', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

const mockRpc = vi.fn()
const mockFrom = vi.fn()

vi.mock('../../supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  } as unknown as SupabaseClient,
}))

// eslint-disable-next-line import/first
import { supabase } from '../../supabase'

const createChainableQuery = () => {
  const chain: {
    select: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
    order: ReturnType<typeof vi.fn>
    limit: ReturnType<typeof vi.fn>
    maybeSingle: ReturnType<typeof vi.fn>
  } = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(),
  }

  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.order.mockReturnValue(chain)
  chain.limit.mockReturnValue(chain)

  return chain
}

const createRpcResponse = (overrides?: { data?: unknown; error?: { message: string } | null }) => ({
  data: overrides?.data ?? [],
  error: overrides?.error ?? null,
})

describe('audioService.getFirstAudioUrlForFeedback', () => {
  const supabaseMock = vi.mocked(supabase)

  beforeEach(() => {
    vi.clearAllMocks()
    supabaseMock.rpc = mockRpc.mockResolvedValue(
      createRpcResponse()
    ) as unknown as typeof supabaseMock.rpc
    supabaseMock.from = mockFrom.mockReturnValue(
      createChainableQuery()
    ) as unknown as typeof supabaseMock.from
  })

  it('returns first audio url from RPC response', async () => {
    mockRpc.mockResolvedValueOnce(
      createRpcResponse({
        data: [
          {
            audio_url: 'https://cdn.example.com/audio/segment-0.mp3',
          },
        ],
      })
    )

    const result = await getFirstAudioUrlForFeedback(123)

    expect(result).toEqual({ ok: true, url: 'https://cdn.example.com/audio/segment-0.mp3' })
    expect(mockRpc).toHaveBeenCalledWith('get_audio_segments_for_feedback', {
      feedback_item_id: 123,
    })
  })

  it('falls back to analysis_audio_segments query when RPC returns empty array', async () => {
    const chain = createChainableQuery()
    chain.maybeSingle.mockResolvedValue({
      data: {
        audio_url: 'https://cdn.example.com/audio/fallback.mp3',
      },
      error: null,
    })

    mockRpc.mockResolvedValue(createRpcResponse({ data: [] }))
    mockFrom.mockReturnValue(chain)

    const result = await getFirstAudioUrlForFeedback(456)

    expect(result).toEqual({ ok: true, url: 'https://cdn.example.com/audio/fallback.mp3' })
    expect(mockFrom).toHaveBeenCalledWith('analysis_audio_segments')
    expect(chain.eq).toHaveBeenCalledWith('feedback_id', 456)
    expect(chain.order).toHaveBeenCalledWith('segment_index', { ascending: true })
    expect(chain.limit).toHaveBeenCalledWith(1)
  })

  it('returns error when RPC fails', async () => {
    mockRpc.mockResolvedValue(
      createRpcResponse({
        error: { message: 'RPC failure' },
      })
    )

    const result = await getFirstAudioUrlForFeedback(789)

    expect(result).toEqual({ ok: false, error: 'RPC failure' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns error when fallback query fails', async () => {
    const chain = createChainableQuery()
    chain.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'No audio row' },
    })

    mockRpc.mockResolvedValue(createRpcResponse({ data: [] }))
    mockFrom.mockReturnValue(chain)

    const result = await getFirstAudioUrlForFeedback(321)

    expect(result).toEqual({ ok: false, error: 'No audio row' })
  })

  it('returns not-available error when no data found in either source', async () => {
    const chain = createChainableQuery()
    chain.maybeSingle.mockResolvedValue({ data: null, error: null })

    mockRpc.mockResolvedValue(createRpcResponse({ data: [] }))
    mockFrom.mockReturnValue(chain)

    const result = await getFirstAudioUrlForFeedback(654)

    expect(result).toEqual({ ok: false, error: 'Audio feedback not available yet.' })
  })

  it('falls back to direct query when RPC references legacy column', async () => {
    const chain = createChainableQuery()
    chain.maybeSingle.mockResolvedValue({
      data: {
        audio_url: 'https://cdn.example.com/audio/legacy-fallback.mp3',
      },
      error: null,
    })

    mockRpc.mockResolvedValue(
      createRpcResponse({
        data: [],
        error: { message: 'column "aas.analysis_feedback_id" does not exist' },
      })
    )
    mockFrom.mockReturnValue(chain)

    const result = await getFirstAudioUrlForFeedback(777)

    expect(result).toEqual({ ok: true, url: 'https://cdn.example.com/audio/legacy-fallback.mp3' })
    expect(mockFrom).toHaveBeenCalledWith('analysis_audio_segments')
    expect(chain.eq).toHaveBeenCalledWith('feedback_id', 777)
  })
})
