import { log } from '@my/logging'
import {
  documentDirectory,
  downloadAsync,
  getInfoAsync,
  makeDirectoryAsync,
} from 'expo-file-system'

const AUDIO_DIR = `${documentDirectory}feedback-audio/`

export async function ensureAudioDirectory() {
  const info = await getInfoAsync(AUDIO_DIR)
  if (!info.exists) {
    await makeDirectoryAsync(AUDIO_DIR, { intermediates: true })
    log.info('audioCache', 'Created feedback audio directory', { AUDIO_DIR })
  }
}

export function getCachedAudioPath(feedbackId: string) {
  return `${AUDIO_DIR}${feedbackId}.m4a`
}

export async function persistAudioFile(feedbackId: string, remoteUrl: string) {
  const target = getCachedAudioPath(feedbackId)
  await downloadAsync(remoteUrl, target)
  return target
}
