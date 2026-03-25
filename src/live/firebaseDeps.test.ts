import { describe, expect, it } from 'vitest'
import { parseAPIResponse } from './firebaseDeps'

describe('parseAPIResponse', () => {
  it('surfaces empty proxy failures without throwing a JSON parse error', async () => {
    await expect(parseAPIResponse(new Response(null, { status: 500, statusText: 'Internal Server Error' }))).rejects.toThrow(
      '500 Internal Server Error',
    )
  })

  it('uses explicit API error messages when JSON is present', async () => {
    await expect(
      parseAPIResponse(
        new Response(JSON.stringify({ error: 'email is not allowlisted' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    ).rejects.toThrow('email is not allowlisted')
  })
})
