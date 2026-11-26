// frontend/src/utils/formatIsoDate.js
// "1913-11-07" -> "7 novembre 1913" (l'API envoie les dates en texte AAAA-MM-JJ)
export function formatIsoDate(iso) {
  if (!iso) return ''
  const [year, month, day] = iso.split('-').map(Number)
  // En UTC : aucun décalage de fuseau horaire possible sur le jour affiché
  const date = new Date(Date.UTC(2000, month - 1, day))
  date.setUTCFullYear(year)
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
