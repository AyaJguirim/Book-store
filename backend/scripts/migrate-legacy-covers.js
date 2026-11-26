// Script à lancer UNE SEULE FOIS : déplace les anciennes couvertures du frontend vers le backend.
//
//   Avant : frontend/public/<id>.jpg            (le livre n° 6 -> frontend/public/6.jpg)
//   Après : backend/uploads/covers/<nom>.jpg    + le nom enregistré dans books.cover_path
//
// Utilisation (depuis le dossier backend) :
//   npm run migrate:covers -- --dry-run     montre ce qui serait fait, sans rien changer
//   npm run migrate:covers                  fait réellement le déplacement
//
// Sécurités :
//   - l'image d'origine n'est supprimée qu'APRÈS la mise à jour de la base ;
//   - un livre qui a déjà une couverture importée n'est pas touché ;
//   - une image qui ne correspond à aucun livre reste en place ;
//   - le script peut être relancé sans risque.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { pool } from '../src/config/database.js'
import { COVERS_DIR } from '../src/config/uploads.js'

const LEGACY_DIR = path.resolve(COVERS_DIR, '..', '..', '..', 'frontend', 'public')
const DRY_RUN = process.argv.includes('--dry-run')
const MAX_ID = 2147483647
const EXTENSIONS = { '.jpg': '.jpg', '.jpeg': '.jpg', '.png': '.png', '.webp': '.webp' }

// Vérifie le vrai contenu du fichier (et pas seulement son extension)
function looksLikeImage(filePath) {
  const head = Buffer.alloc(12)
  const fd = fs.openSync(filePath, 'r')
  try {
    fs.readSync(fd, head, 0, 12, 0)
  } finally {
    fs.closeSync(fd)
  }
  const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff
  const isPng = head.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))
  const isWebp = head.subarray(0, 4).toString('latin1') === 'RIFF' && head.subarray(8, 12).toString('latin1') === 'WEBP'
  return isJpeg || isPng || isWebp
}

async function main() {
  if (!fs.existsSync(LEGACY_DIR)) {
    console.error(`Dossier introuvable : ${LEGACY_DIR}\nLancez ce script depuis le dossier backend du projet complet.`)
    process.exitCode = 1
    return
  }
  fs.mkdirSync(COVERS_DIR, { recursive: true })

  // Les anciennes couvertures : un nom du type "6.jpg" (un numéro de livre + une extension d'image)
  const files = fs
    .readdirSync(LEGACY_DIR)
    .map((name) => ({ name, match: /^(\d+)(\.[a-z]+)$/i.exec(name) }))
    .filter(({ match }) => match && EXTENSIONS[match[2].toLowerCase()])
    .map(({ name, match }) => ({ name, id: Number(match[1]), ext: EXTENSIONS[match[2].toLowerCase()] }))
    .sort((a, b) => a.id - b.id)

  console.log(DRY_RUN ? '--- SIMULATION : rien ne sera modifié ---' : '--- DÉPLACEMENT DES COUVERTURES ---')
  console.log(`${files.length} ancienne(s) image(s) trouvée(s) dans ${LEGACY_DIR}\n`)

  const counts = { moved: 0, skipped: 0 }

  for (const file of files) {
    const source = path.join(LEGACY_DIR, file.name)

    if (file.id < 1 || file.id > MAX_ID) {
      console.log(`  ${file.name} : numéro invalide, laissée en place`)
      counts.skipped++
      continue
    }

    const { rows } = await pool.query('SELECT title, cover_path FROM books WHERE id = $1::integer', [file.id])
    if (rows.length === 0) {
      console.log(`  ${file.name} : aucun livre n°${file.id} dans la base, laissée en place`)
      counts.skipped++
      continue
    }
    const { title, cover_path: existing } = rows[0]
    if (existing) {
      console.log(`  ${file.name} : « ${title} » a déjà une couverture importée, laissée en place`)
      counts.skipped++
      continue
    }
    if (!looksLikeImage(source)) {
      console.log(`  ${file.name} : ce n'est pas une vraie image, laissée en place`)
      counts.skipped++
      continue
    }

    if (DRY_RUN) {
      console.log(`  ${file.name} -> couverture de « ${title} »  (simulation)`)
      counts.moved++
      continue
    }

    // 1) copie dans backend/uploads/covers  2) mise à jour de la base  3) suppression de l'original
    const newName = `${crypto.randomUUID()}${file.ext}`
    const target = path.join(COVERS_DIR, newName)
    fs.copyFileSync(source, target)
    try {
      const result = await pool.query(
        'UPDATE books SET cover_path = $2 WHERE id = $1::integer AND cover_path IS NULL',
        [file.id, newName],
      )
      if (result.rowCount === 0) throw new Error('le livre a changé pendant le script')
    } catch (error) {
      fs.rmSync(target, { force: true }) // la base n'a pas été mise à jour : on retire la copie
      throw error
    }
    fs.rmSync(source)
    console.log(`  ${file.name} -> couverture de « ${title} »  OK`)
    counts.moved++
  }

  console.log(
    `\nTerminé : ${counts.moved} couverture(s) ${DRY_RUN ? 'à déplacer' : 'déplacée(s)'}, ${counts.skipped} ignorée(s).`,
  )
  if (DRY_RUN) console.log('Relancez sans --dry-run pour appliquer.')
}

try {
  await main()
} catch (error) {
  if (error.code === '42703') {
    console.error('La colonne cover_path n\'existe pas : exécutez d\'abord sql/migration_pdf_reader.sql.')
  } else {
    console.error('Erreur :', error.message)
  }
  process.exitCode = 1
} finally {
  await pool.end()
}
