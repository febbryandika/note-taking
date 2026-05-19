import { describe, expect, mock, test } from 'bun:test'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TagInput } from './TagInput'

function setup(initialTags: string[] = []) {
  const onChange = mock((_: string[]) => {})
  render(<TagInput tags={initialTags} onChange={onChange} />)
  const input = screen.getByRole('textbox') as HTMLInputElement
  return { input, onChange }
}

describe('TagInput', () => {
  test('Enter commits a trimmed, lowercased tag', async () => {
    const user = userEvent.setup()
    const { input, onChange } = setup()
    await user.type(input, '  HELLO  ')
    await user.keyboard('{Enter}')
    expect(onChange).toHaveBeenCalledWith(['hello'])
  })

  test('comma commits a tag', async () => {
    const user = userEvent.setup()
    const { input, onChange } = setup()
    await user.type(input, 'urgent,')
    expect(onChange).toHaveBeenCalledWith(['urgent'])
  })

  test('blur commits the current draft', async () => {
    const user = userEvent.setup()
    const { input, onChange } = setup()
    await user.type(input, 'todo')
    input.blur()
    expect(onChange).toHaveBeenCalledWith(['todo'])
  })

  test('duplicate tags are ignored', async () => {
    const user = userEvent.setup()
    const { input, onChange } = setup(['hello'])
    await user.type(input, 'HELLO')
    await user.keyboard('{Enter}')
    expect(onChange).not.toHaveBeenCalled()
  })

  test('Backspace on empty input removes the last tag', async () => {
    const user = userEvent.setup()
    const { input, onChange } = setup(['a', 'b', 'c'])
    input.focus()
    await user.keyboard('{Backspace}')
    expect(onChange).toHaveBeenCalledWith(['a', 'b'])
  })

  test('clicking the X removes that specific tag', async () => {
    const user = userEvent.setup()
    const onChange = mock((_: string[]) => {})
    render(<TagInput tags={['a', 'b', 'c']} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: /Remove tag b/i }))
    expect(onChange).toHaveBeenCalledWith(['a', 'c'])
  })
})
