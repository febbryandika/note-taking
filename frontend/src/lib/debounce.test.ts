import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { debounce } from './debounce'

describe('debounce', () => {
  beforeEach(() => {})
  afterEach(() => {})

  test('invokes fn once after the delay if no further calls arrive', async () => {
    const fn = mock(() => {})
    const d = debounce(fn, 10)
    d('a')
    expect(fn).not.toHaveBeenCalled()
    await new Promise((r) => setTimeout(r, 25))
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn.mock.calls[0]).toEqual(['a'])
  })

  test('each call resets the timer (last-args-win)', async () => {
    const fn = mock((_: string) => {})
    const d = debounce(fn, 10)
    d('first')
    await new Promise((r) => setTimeout(r, 5))
    d('second')
    await new Promise((r) => setTimeout(r, 5))
    d('third')
    await new Promise((r) => setTimeout(r, 25))
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn.mock.calls[0]).toEqual(['third'])
  })

  test('cancel() aborts a pending call', async () => {
    const fn = mock(() => {})
    const d = debounce(fn, 10)
    d('x')
    d.cancel()
    await new Promise((r) => setTimeout(r, 25))
    expect(fn).not.toHaveBeenCalled()
  })

  test('can be called again after cancel', async () => {
    const fn = mock((_: string) => {})
    const d = debounce(fn, 10)
    d('one')
    d.cancel()
    d('two')
    await new Promise((r) => setTimeout(r, 25))
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn.mock.calls[0]).toEqual(['two'])
  })
})
