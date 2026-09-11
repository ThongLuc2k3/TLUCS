import test from 'node:test'
import assert from 'node:assert/strict'
import { chunkCommunityText } from '../src/services/knowledgeLifecycleService.js'

test('chunk cộng đồng có overlap và không làm mất nội dung cuối',()=>{
  const words=Array.from({length:1000},(_,i)=>`w${i}`)
  const chunks=chunkCommunityText(words.join(' '),{targetWords:300,overlapWords:50})
  assert.equal(chunks.length,4)
  assert.match(chunks[0],/^w0 /)
  assert.match(chunks[1],/^w250 /)
  assert.match(chunks.at(-1),/w999$/)
})
