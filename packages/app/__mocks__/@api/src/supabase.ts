// Mock for @api/src/supabase
export const supabase = {
  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  })),
  realtime: {
    onConnStateChange: jest.fn(),
  },
}
