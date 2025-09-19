/**
 * Template rendering utilities for AI prompts
 * Handles parameter substitution, validation, and formatting
 */

import { log } from '@my/logging'
import { TemplateContext, ValidationResult } from './types'

/**
 * Render a template string with parameters
 */
export function renderTemplate(template: string, params: TemplateContext): string {
  let result = template

  // Replace all template variables
  Object.entries(params).forEach(([key, value]) => {
    const placeholder = `{${key}}`
    if (result.includes(placeholder)) {
      result = result.replace(new RegExp(escapeRegExp(placeholder), 'g'), String(value))
    }
  })

  return result
}

/**
 * Validate template parameters against required fields
 */
export function validateTemplateParams(
  template: string,
  params: TemplateContext,
  requiredFields: string[] = []
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check for missing required fields
  requiredFields.forEach((field) => {
    if (!(field in params)) {
      errors.push(`Missing required parameter: ${field}`)
    }
  })

  // Check for unused parameters
  const templatePlaceholders = extractPlaceholders(template)
  Object.keys(params).forEach((param) => {
    if (!templatePlaceholders.includes(param)) {
      warnings.push(`Unused parameter: ${param}`)
    }
  })

  // Check for unreplaced placeholders
  templatePlaceholders.forEach((placeholder) => {
    if (!(placeholder in params)) {
      errors.push(`Missing value for template placeholder: ${placeholder}`)
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Extract all placeholder names from a template string
 */
export function extractPlaceholders(template: string): string[] {
  const matches = template.match(/\{([^}]+)\}/g)
  if (!matches) return []

  return matches
    .map((match) => match.slice(1, -1))
    .filter(
      (value, index, self) => self.indexOf(value) === index // Remove duplicates
    )
}

/**
 * Apply defaults to parameters
 */
export function applyDefaults(
  params: TemplateContext,
  defaults: Record<string, any>
): TemplateContext {
  const result = { ...params }

  Object.entries(defaults).forEach(([key, defaultValue]) => {
    if (!(key in result) || result[key] === undefined || result[key] === null) {
      result[key] = defaultValue
    }
  })

  return result
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Format template for better readability
 */
export function formatTemplate(template: string): string {
  return template
    .replace(/\n\s*\n/g, '\n\n') // Normalize multiple newlines
    .trim()
}

/**
 * Create a reusable template renderer with validation
 */
export function createTemplateRenderer(
  template: string,
  defaults: Record<string, any> = {},
  requiredFields: string[] = [],
  enableValidation = true
) {
  return (params = {}): string => {
    const mergedParams = applyDefaults(params, defaults)

    if (enableValidation) {
      const validation = validateTemplateParams(template, mergedParams, requiredFields)
      if (!validation.isValid) {
        throw new Error(`Template validation failed: ${validation.errors.join(', ')}`)
      }
      if (validation.warnings.length > 0) {
        log.warn('Template warnings', { warnings: validation.warnings })
      }
    }

    return renderTemplate(template, mergedParams)
  }
}
