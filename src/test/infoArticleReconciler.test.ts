import { describe, expect, it } from 'vitest'
import { reconcileInfoArticle } from '../../scripts/lib/info_article_reconciler.mjs'

const source = { key: 'official', url: 'https://example.com', contentHash: 'abc' }
const article = { lede: 'Useful synthesis.', sections: [{ key: 'rules', title: 'Rules', facts: [{ label: 'Entry', value: '$5' }] }], unknowns: ['Inventory is unknown.'], contradictions: [], recent_changes: [] }
const candidate = { topic_key: 'play', sources: [source], article, feed: { entry_key: 'play:new' } }

describe('Info article reconciliation', () => {
  it('rejects link-only discovery as incomplete', () => expect(reconcileInfoArticle(null, { topic_key: 'play', sources: [{ key: 'official', url: 'https://example.com' }] })).toMatchObject({ article_status: 'incomplete', publishable: false, feed: null }))
  it('merges cross-source sections into one article', () => {
    const existing = { ...candidate, article_status: 'maintained', article, sources: [source] }
    const next = reconcileInfoArticle(existing, { ...candidate, sources: [{ key: 'guide', contentHash: 'def' }], article: { ...article, sections: [{ key: 'where', title: 'Where' }] } }, 'material_update')
    expect(next.topic.article.sections.map((section: any) => section.key)).toEqual(['rules', 'where'])
    expect(next.topic.sources).toHaveLength(2)
  })
  it('updates a section without duplicating the article', () => {
    const existing = { ...candidate, article_status: 'maintained', article, sources: [source] }
    const next = reconcileInfoArticle(existing, { ...candidate, article: { ...article, sections: [{ key: 'rules', title: 'Rules updated' }] } }, 'material_update')
    expect(next.topic.article.sections).toEqual([{ key: 'rules', title: 'Rules updated' }])
    expect(next.feed).not.toBeNull()
  })
  it('retains unknowns and contradictions', () => {
    const existing = { ...candidate, article_status: 'maintained', article, sources: [source] }
    const next = reconcileInfoArticle(existing, { ...candidate, article: { ...article, unknowns: ['Final stock is unknown.'], contradictions: [{ summary: 'Sunday times conflict.', sourceKeys: ['official'] }] } }, 'contradiction')
    expect(next.topic.article.unknowns).toEqual(['Inventory is unknown.', 'Final stock is unknown.'])
    expect(next.topic.article.contradictions).toHaveLength(1)
  })
  it('keeps corroboration silent', () => expect(reconcileInfoArticle({ ...candidate, article_status: 'maintained' }, candidate, 'corroboration')).toMatchObject({ publishable: false, feed: null }))
})
