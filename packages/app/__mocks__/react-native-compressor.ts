const mockCompress = jest.fn(async (_uri: string) => 'file:///mock/compressed.mp4')

export const Video = {
  compress: mockCompress,
}

export default {
  Video,
}
