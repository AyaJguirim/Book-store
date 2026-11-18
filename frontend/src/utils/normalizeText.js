// Met un texte sous une forme "neutre" pour pouvoir le comparer :
// sans accents, en minuscules, sans espaces superflus.
export function normalizeText(text) {
  return String(text ?? '')
    .normalize('NFD')                 // "é" devient "e" + accent
    .replace(/[\u0300-\u036f]/g, '')  // supprime les accents
    .toLowerCase()
    .trim()                           // retire les espaces au début et à la fin
    .replace(/\s+/g, ' ')             // remplace plusieurs espaces par un seul
}