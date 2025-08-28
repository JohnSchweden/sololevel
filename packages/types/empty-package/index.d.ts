// This is an empty types file to replace deprecated dependencies
// This file exists to satisfy the dependency resolution without errors.

// For abab replacement
export function atob(data: string): string
export function btoa(data: string): string

// For domexception replacement
export class DOMException extends Error {
  constructor(message?: string, name?: string)
  readonly code: number
  readonly name: string
}
