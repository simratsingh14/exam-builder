import { describe, it, expect } from 'vitest'
import { createEmptyPaper, createEmptyQuestion } from './api'

describe('createEmptyPaper', () => {
  it('creates a paper with a unique id', () => {
    const p1 = createEmptyPaper()
    const p2 = createEmptyPaper()
    expect(p1.id).toBeTruthy()
    expect(p1.id).not.toBe(p2.id)
  })

  it('has default style', () => {
    const paper = createEmptyPaper()
    expect(paper.style.font_family).toBe('Times New Roman')
    expect(paper.style.font_size).toBe(12)
  })
})

describe('createEmptyQuestion', () => {
  it('creates a text question by default', () => {
    const q = createEmptyQuestion('text')
    expect(q.type).toBe('text')
  })

  it('creates an mcq question with 4 options', () => {
    const q = createEmptyQuestion('mcq')
    expect(q.type).toBe('mcq')
    if (q.type === 'mcq') {
      expect(q.options).toHaveLength(4)
    }
  })
})
