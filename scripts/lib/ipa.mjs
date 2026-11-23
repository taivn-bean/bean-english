// ARPAbet (CMU dict) → IPA (General American), with a simple syllable-onset heuristic for stress marks.
import { dictionary } from 'cmu-pronouncing-dictionary'

const VOWELS = {
  AA: 'ɑ', AE: 'æ', AH: 'ʌ', AO: 'ɔ', AW: 'aʊ', AY: 'aɪ', EH: 'ɛ', ER: 'ɝ',
  EY: 'eɪ', IH: 'ɪ', IY: 'i', OW: 'oʊ', OY: 'ɔɪ', UH: 'ʊ', UW: 'u',
}
const UNSTRESSED = { AH: 'ə', ER: 'ɚ' }
const CONSONANTS = {
  B: 'b', CH: 'tʃ', D: 'd', DH: 'ð', F: 'f', G: 'ɡ', HH: 'h', JH: 'dʒ', K: 'k', L: 'l',
  M: 'm', N: 'n', NG: 'ŋ', P: 'p', R: 'ɹ', S: 's', SH: 'ʃ', T: 't', TH: 'θ', V: 'v',
  W: 'w', Y: 'j', Z: 'z', ZH: 'ʒ',
}
const LEGAL_2_ONSET = (a, b) => ['L', 'R', 'W', 'Y'].includes(b) || a === 'S'

function arpabetToIpa(arpabet) {
  const phones = arpabet.split(' ').map((p) => {
    const m = p.match(/^([A-Z]+)([012])?$/)
    return { base: m[1], stress: m[2] }
  })
  const vowelIdx = phones.flatMap((p, i) => (p.stress !== undefined ? [i] : []))
  const marks = new Map() // phone index → stress mark inserted before it
  if (vowelIdx.length > 1) {
    vowelIdx.forEach((vi, k) => {
      const mark = phones[vi].stress === '1' ? 'ˈ' : phones[vi].stress === '2' ? 'ˌ' : null
      if (!mark) return
      const prev = k === 0 ? -1 : vowelIdx[k - 1]
      const n = vi - prev - 1 // consonants between previous vowel and this one
      let onset = n
      if (prev >= 0) onset = n >= 2 && LEGAL_2_ONSET(phones[vi - 2].base, phones[vi - 1].base) ? 2 : Math.min(n, 1)
      marks.set(vi - onset, mark)
    })
  }
  return phones
    .map((p, i) => {
      const sym = p.stress === undefined
        ? CONSONANTS[p.base]
        : p.stress === '0' && UNSTRESSED[p.base] ? UNSTRESSED[p.base] : VOWELS[p.base]
      return (marks.get(i) ?? '') + sym
    })
    .join('')
}

function lookup(word) {
  const w = word.toLowerCase()
  if (dictionary[w]) return arpabetToIpa(dictionary[w])
  if (w.includes('-')) {
    const parts = w.split('-').map(lookup)
    return parts.every(Boolean) ? parts.join('-') : null
  }
  return null
}

/** @returns {{ ipa: string, unknown: string[] }} */
export function toIpa(sentence) {
  const unknown = []
  const words = sentence
    .replace(/[“”"]/g, '')
    .replace(/’/g, "'")
    .split(/\s+/)
    .map((tok) => tok.replace(/^[^a-zA-Z]+/, '').replace(/[^a-zA-Z]+$/, ''))
    .filter(Boolean)
    .map((w) => {
      const ipa = lookup(w)
      if (!ipa) unknown.push(w)
      return ipa ?? w.toLowerCase()
    })
  return { ipa: `/${words.join(' ')}/`, unknown }
}
