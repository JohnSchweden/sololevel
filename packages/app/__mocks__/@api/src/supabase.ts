// Mock for @api/src/supabase
export const supabase = {
  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(() => ({
      // Return a proper unsubscribe function for testing
      unsubscribe: jest.fn(),
    })),
    unsubscribe: jest.fn(),
  })),
  auth: {
    onAuthStateChange: jest.fn(() => ({
      // Return a proper unsubscribe function for testing
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
  },
  realtime: {
    onConnStateChange: jest.fn(),
  },
}
