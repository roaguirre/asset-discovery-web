import { readFileSync } from 'node:fs'
import Ajv from 'ajv'
import type { AnySchema } from 'ajv'
import addFormats from 'ajv-formats'
import { describe, expect, it } from 'vitest'

function readJSON<T>(path: string): T {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as T
}

describe('pinned visualizer contract', () => {
  it('validates the pinned fixtures against the pinned v1 schemas', () => {
    const ajv = new Ajv({ allErrors: true, strict: false })
    addFormats(ajv)

    const manifestSchema = readJSON<AnySchema>('../contracts/visualizer/manifest.v1.schema.json')
    const runSchema = readJSON<AnySchema>('../contracts/visualizer/run.v1.schema.json')
    const manifestFixture = readJSON<unknown>('../contracts/visualizer/manifest.v1.fixture.json')
    const runFixture = readJSON<unknown>('../contracts/visualizer/run.v1.fixture.json')

    const validateManifest = ajv.compile(manifestSchema)
    const validateRun = ajv.compile(runSchema)

    expect(validateManifest(manifestFixture)).toBe(true)
    expect(validateRun(runFixture)).toBe(true)

    if (!validateManifest(manifestFixture)) {
      throw new Error(`manifest fixture schema errors: ${ajv.errorsText(validateManifest.errors)}`)
    }
    if (!validateRun(runFixture)) {
      throw new Error(`run fixture schema errors: ${ajv.errorsText(validateRun.errors)}`)
    }
  })
})
