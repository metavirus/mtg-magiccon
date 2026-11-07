import { describe, expect, it } from 'vitest'
import { mapBoothFacts, matchMapRecord, readMapMessage } from './kaviMapBridge'
describe('private map bridge', () => {
  const source = {} as Window
  const data = {type: 'kavimap:open', version: 1, place: {kind: 'artist', name: 'Mark Poole'}}
  it('accepts only the current opaque iframe and a closed message schema', () => {
    expect(readMapMessage({source, origin: 'null', data}, source)).toEqual(data)
    expect(readMapMessage({source: {} as Window, origin: 'null', data}, source)).toBeNull()
    expect(readMapMessage({source, origin: 'https://evil.test', data}, source)).toBeNull()
    expect(readMapMessage({source, origin: 'null', data: {...data, url: 'https://evil.test'}}, source)).toBeNull()
    expect(readMapMessage({source, origin: 'null', data: {...data, place: {...data.place, id: 'forged'}}}, source)).toBeNull()
    expect(readMapMessage({source, origin: 'null', data: {...data, version: 2}}, source)).toBeNull()
  })
  it('matches punctuation, diacritics and declared aliases without fuzzy guesses', () => {
    const rows = [{name:'Martina Fačková'}, {name:'Beadle & Grimm’s', aliases:['Beadle and Grimms']}]
    expect(matchMapRecord({kind:'artist',name:'Martina Fackova'},rows)).toBe(rows[0])
    expect(matchMapRecord({kind:'vendor',name:'Beadle and Grimms'},rows)).toBe(rows[1])
    expect(matchMapRecord({kind:'artist',name:'Martina'},rows)).toBeUndefined()
  })
  it('uses verified short map captions and preserves the official map booth', () => {
    expect(matchMapRecord({kind:'vendor',name:'Mage’s Sanctum'},[{name:'Mages Sanctum LLC'}])?.name).toBe('Mages Sanctum LLC')
    expect(matchMapRecord({kind:'artist',name:'Jason Engle'},[{name:'Jason A. Engle'}])?.name).toBe('Jason A. Engle')
    expect(mapBoothFacts([{label:'Booth',value:'7117'}], '6061')).toEqual([{label:'Booth',value:'6061'}])
  })
  it('never guesses identity from a shared booth, and rejects ambiguous names', () => {
    const rows = [{name:'Studio',booth:'1071'}, {name:'Studio',booth:'1072'}, {name:'Other',booth:'1071'}]
    expect(matchMapRecord({kind:'vendor',name:'Missing',booth:'1071'},rows)).toBeUndefined()
    expect(matchMapRecord({kind:'vendor',name:'Studio'},rows)).toBeUndefined()
    expect(matchMapRecord({kind:'vendor',name:'Studio',booth:'1072'},rows)).toBe(rows[1])
  })
})
