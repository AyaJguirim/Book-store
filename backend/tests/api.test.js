import { test, after } from 'node:test'
import jwt from 'jsonwebtoken'
import { pool } from '../src/config/database.js'
import assert from 'node:assert/strict'

const BASE_URL = process.env.API_URL || 'http://localhost:3000'

// Envoie une requête et retourne le code HTTP + le JSON reçu
async function request(path, options) {
  const response = await fetch(`${BASE_URL}${path}`, options)
  const body = await response.json()
  return { status: response.status, body }
}

test('GET /api/health répond 200', async () => {
  const { status, body } = await request('/api/health')
  assert.equal(status, 200)
  assert.equal(body.status, 'ok')
})
test('GET /api/health/db confirme la connexion à PostgreSQL', async () => {
  const { status, body } = await request('/api/health/db')
  assert.equal(status, 200)
  assert.equal(body.status, 'ok')
})

test('GET /api/books renvoie une liste de livres complets', async () => {
  const { status, body } = await request('/api/books')
  assert.equal(status, 200)
  assert.ok(Array.isArray(body.data))
  assert.ok(body.data.length > 0)
  for (const book of body.data) {
    assert.ok(book.id && book.title && book.author && book.category_id)
  }
})

test('GET /api/categories renvoie une liste de catégories', async () => {
  const { status, body } = await request('/api/categories')
  assert.equal(status, 200)
  assert.ok(body.data.length > 0)
  for (const category of body.data) {
    assert.ok(category.id && category.name)
  }
})

test('La recherche ignore la casse et les accents', async () => {
  const a = await request('/api/books?search=ETRANGER')
  const b = await request('/api/books?search=%C3%89tranger') // "Étranger"
  assert.equal(a.status, 200)
  assert.ok(a.body.data.length >= 1)
  assert.deepEqual(a.body.data, b.body.data)
})

test('Le filtre categoryId ne renvoie que les livres de cette catégorie', async () => {
  const categories = await request('/api/categories')
  const categoryId = categories.body.data[0].id

  const { status, body } = await request(`/api/books?categoryId=${categoryId}`)
  assert.equal(status, 200)
  assert.ok(body.data.length > 0)
  for (const book of body.data) {
    assert.equal(book.category_id, categoryId)
  }
})

test('Recherche + catégorie combinées (ET) : aucun résultat = 200 et liste vide', async () => {
  const { status, body } = await request('/api/books?search=zzzzzzzz&categoryId=1')
  assert.equal(status, 200)
  assert.deepEqual(body.data, [])
})

test('categoryId valide mais inexistant : 200 et liste vide', async () => {
  const { status, body } = await request('/api/books?categoryId=999999')
  assert.equal(status, 200)
  assert.deepEqual(body.data, [])
})

test('categoryId invalide : 400', async () => {
  const invalidValues = ['abc', '0', '-1', '2.5', '99999999999']
  for (const value of invalidValues) {
    const { status, body } = await request(`/api/books?categoryId=${encodeURIComponent(value)}`)
    assert.equal(status, 400, `categoryId=${value} devrait renvoyer 400`)
    assert.ok(body.error.message)
  }

  const repeated = await request('/api/books?categoryId=1&categoryId=2')
  assert.equal(repeated.status, 400)
})

test('search invalide (trop long ou répété) : 400', async () => {
  const tooLong = await request(`/api/books?search=${'a'.repeat(101)}`)
  assert.equal(tooLong.status, 400)

  const repeated = await request('/api/books?search=a&search=b')
  assert.equal(repeated.status, 400)
})

test('GET /api/books/:id renvoie un seul livre (objet)', async () => {
  const list = await request('/api/books')
  const first = list.body.data[0]

  const { status, body } = await request(`/api/books/${first.id}`)
  assert.equal(status, 200)
  assert.equal(Array.isArray(body.data), false)
  assert.equal(body.data.id, first.id)
  assert.equal(body.data.title, first.title)
})

test('GET /api/books/:id inexistant : 404', async () => {
  const { status, body } = await request('/api/books/999999')
  assert.equal(status, 404)
  assert.ok(body.error.message)
})

test('GET /api/books/:id invalide : 400', async () => {
  for (const value of ['abc', '0', '-5']) {
    const { status } = await request(`/api/books/${value}`)
    assert.equal(status, 400, `id=${value} devrait renvoyer 400`)
  }
})

test('Route inconnue : 404 en JSON', async () => {
  const { status, body } = await request('/api/nimportequoi')
  assert.equal(status, 404)
  assert.ok(body.error.message)
})

test('Corps JSON invalide : 400', async () => {
  const { status, body } = await request('/api/books', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{abc',
  })
  assert.equal(status, 400)
  assert.ok(body.error.message)
})

test('La recherche traite % et _ comme du texte, pas comme des jokers', async () => {
  for (const value of ['%', '_']) {
    const { status, body } = await request(`/api/books?search=${encodeURIComponent(value)}`)
    assert.equal(status, 200)
    assert.deepEqual(body.data, [], `search=${value} ne devrait trouver aucun livre`)
  }
})

test('Une tentative d\'injection SQL est traitée comme un simple texte', async () => {
  const attack = "'; DROP TABLE books; --"
  const { status, body } = await request(`/api/books?search=${encodeURIComponent(attack)}`)
  assert.equal(status, 200)
  assert.deepEqual(body.data, [])

  // La table existe toujours et contient encore des livres
  const after = await request('/api/books')
  assert.ok(after.body.data.length > 0)
})

test('GET /api/books/:id renvoie la description et le nom de la catégorie', async () => {
  const list = await request('/api/books')
  const { body } = await request(`/api/books/${list.body.data[0].id}`)
  assert.ok('description' in body.data)
  assert.ok(body.data.category)
})

// ===================== Authentification =====================

const TEST_PASSWORD = 'motdepasse-de-test-123'
let emailCounter = 0

function uniqueEmail() {
  emailCounter += 1
  return `lecteur-${Date.now()}-${emailCounter}@test.invalid`
}

function jsonPost(payload) {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }
}

// Crée un compte de test et renvoie ses informations avec la réponse de l'API
async function registerAccount(overrides = {}) {
  const account = { name: 'Lecteur Test', email: uniqueEmail(), password: TEST_PASSWORD, ...overrides }
  const response = await request('/api/auth/register', jsonPost(account))
  return { account, ...response }
}

// Nettoyage : supprime les comptes de test puis ferme la connexion à la base
after(async () => {
  await pool.query("DELETE FROM users WHERE email LIKE '%@test.invalid'")
  await pool.end()
})

test('POST /api/auth/register crée un compte et ne renvoie jamais le hash', async () => {
  const { account, status, body } = await registerAccount()
  assert.equal(status, 201)
  assert.equal(typeof body.data.token, 'string')
  assert.equal(body.data.user.email, account.email)
  assert.equal(body.data.user.name, account.name)
  assert.ok(body.data.user.id)
  assert.equal('password_hash' in body.data.user, false)
  assert.equal(JSON.stringify(body).includes('password'), false)
})

test('Le mot de passe est stocké haché (bcrypt), jamais en clair', async () => {
  const { account } = await registerAccount()
  const result = await pool.query('SELECT password_hash FROM users WHERE email = $1', [account.email])
  const hash = result.rows[0].password_hash
  assert.ok(hash.startsWith('$2'), 'le hash doit être au format bcrypt')
  assert.notEqual(hash, account.password)
})

test('Inscription avec un e-mail déjà utilisé (même en majuscules) : 409', async () => {
  const { account } = await registerAccount()
  const { status, body } = await request(
    '/api/auth/register',
    jsonPost({ ...account, email: account.email.toUpperCase() }),
  )
  assert.equal(status, 409)
  assert.ok(body.error.message)
})

test('Inscription avec des données invalides : 400', async () => {
  const valid = { name: 'Lecteur', email: uniqueEmail(), password: TEST_PASSWORD }
  const invalidBodies = [
    {},
    { ...valid, email: 'pas-un-email' },
    { ...valid, name: '   ' },
    { ...valid, password: 'court' },
    { ...valid, password: 'a'.repeat(73) },
    { ...valid, password: 12345678 },
    { ...valid, name: ['Lecteur'] },
  ]
  for (const payload of invalidBodies) {
    const { status, body } = await request('/api/auth/register', jsonPost(payload))
    assert.equal(status, 400, `devrait refuser : ${JSON.stringify(payload)}`)
    assert.ok(body.error.message)
  }
})

test('Inscription sans corps de requête : 400', async () => {
  const { status } = await request('/api/auth/register', { method: 'POST' })
  assert.equal(status, 400)
})

test('POST /api/auth/login avec les bons identifiants : 200 et un jeton', async () => {
  const { account } = await registerAccount()
  const { status, body } = await request(
    '/api/auth/login',
    jsonPost({ email: account.email, password: account.password }),
  )
  assert.equal(status, 200)
  assert.equal(typeof body.data.token, 'string')
  assert.equal(body.data.user.email, account.email)
  assert.equal('password_hash' in body.data.user, false)
})

test('Connexion : e-mail insensible à la casse', async () => {
  const { account } = await registerAccount()
  const { status } = await request(
    '/api/auth/login',
    jsonPost({ email: account.email.toUpperCase(), password: account.password }),
  )
  assert.equal(status, 200)
})

test('Connexion : mauvais mot de passe et e-mail inconnu donnent le même 401', async () => {
  const { account } = await registerAccount()

  const wrongPassword = await request(
    '/api/auth/login',
    jsonPost({ email: account.email, password: 'mauvais-mot-de-passe' }),
  )
  const unknownEmail = await request(
    '/api/auth/login',
    jsonPost({ email: uniqueEmail(), password: account.password }),
  )

  assert.equal(wrongPassword.status, 401)
  assert.equal(unknownEmail.status, 401)
  assert.equal(wrongPassword.body.error.message, unknownEmail.body.error.message)
})

test('GET /api/auth/me avec un jeton valide : 200', async () => {
  const { account, body: registered } = await registerAccount()
  const { status, body } = await request('/api/auth/me', {
    headers: { Authorization: `Bearer ${registered.data.token}` },
  })
  assert.equal(status, 200)
  assert.equal(body.data.user.email, account.email)
  assert.equal('password_hash' in body.data.user, false)
})

test('GET /api/auth/me sans jeton ou avec un jeton invalide : 401', async () => {
  const toBase64Url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const secret = process.env.JWT_SECRET

  const badTokens = {
    'jeton aléatoire': 'n-importe-quoi',
    'signé avec un autre secret': jwt.sign({ sub: '1' }, 'un-autre-secret-complètement-différent'),
    'expiré': jwt.sign({ sub: '1' }, secret, { expiresIn: -10 }),
    'algorithme none': `${toBase64Url({ alg: 'none', typ: 'JWT' })}.${toBase64Url({ sub: '1' })}.`,
    'compte inexistant': jwt.sign({ sub: '2000000000' }, secret),
  }

  const withoutHeader = await request('/api/auth/me')
  assert.equal(withoutHeader.status, 401)

  for (const [label, token] of Object.entries(badTokens)) {
    const { status, body } = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    assert.equal(status, 401, `jeton ${label} devrait être refusé`)
    assert.ok(body.error.message)
  }
})

// ===================== Consultés récemment =====================

function bearer(token, options = {}) {
  return { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } }
}

async function firstBookIds(count) {
  const { body } = await request('/api/books')
  return body.data.slice(0, count).map((book) => book.id)
}

test('Les routes /api/me/recent-views exigent une connexion : 401', async () => {
  const calls = [
    ['/api/me/recent-views', undefined],
    ['/api/me/recent-views/1', { method: 'PUT' }],
    ['/api/me/recent-views', { method: 'DELETE' }],
  ]
  for (const [path, options] of calls) {
    const { status } = await request(path, options)
    assert.equal(status, 401, `${path} sans jeton devrait renvoyer 401`)
  }
})

test("Une consultation est enregistrée, remonte en premier et n'est jamais en double", async () => {
  const { body: registered } = await registerAccount()
  const token = registered.data.token
  const [a, b] = await firstBookIds(2)

  const put = (id) => request(`/api/me/recent-views/${id}`, bearer(token, { method: 'PUT' }))
  const list = async () => (await request('/api/me/recent-views', bearer(token))).body.data

  assert.equal((await put(a)).status, 200)
  assert.equal((await put(b)).status, 200)
  assert.deepEqual((await list()).map((book) => book.id), [b, a])

  // Revoir le livre a le replace en tête, sans créer de doublon
  await put(a)
  const afterRevisit = await list()
  assert.deepEqual(afterRevisit.map((book) => book.id), [a, b])
  assert.ok(afterRevisit[0].title && afterRevisit[0].category)
})

test('Consultation : id invalide 400, livre inexistant 404', async () => {
  const { body: registered } = await registerAccount()
  const token = registered.data.token

  for (const value of ['abc', '0', '-1']) {
    const { status } = await request(`/api/me/recent-views/${value}`, bearer(token, { method: 'PUT' }))
    assert.equal(status, 400, `bookId=${value} devrait renvoyer 400`)
  }

  const missing = await request('/api/me/recent-views/999999', bearer(token, { method: 'PUT' }))
  assert.equal(missing.status, 404)
})

test('Les consultations récentes sont privées à chaque compte', async () => {
  const tokenA = (await registerAccount()).body.data.token
  const tokenB = (await registerAccount()).body.data.token
  const [id] = await firstBookIds(1)

  await request(`/api/me/recent-views/${id}`, bearer(tokenA, { method: 'PUT' }))

  const listA = await request('/api/me/recent-views', bearer(tokenA))
  const listB = await request('/api/me/recent-views', bearer(tokenB))
  assert.equal(listA.body.data.length, 1)
  assert.deepEqual(listB.body.data, [])
})

test("DELETE vide uniquement l'historique du compte connecté", async () => {
  const tokenA = (await registerAccount()).body.data.token
  const tokenB = (await registerAccount()).body.data.token
  const [id] = await firstBookIds(1)

  await request(`/api/me/recent-views/${id}`, bearer(tokenA, { method: 'PUT' }))
  await request(`/api/me/recent-views/${id}`, bearer(tokenB, { method: 'PUT' }))

  const cleared = await request('/api/me/recent-views', bearer(tokenA, { method: 'DELETE' }))
  assert.equal(cleared.status, 200)
  assert.equal(cleared.body.data.deleted, 1)

  const listA = await request('/api/me/recent-views', bearer(tokenA))
  const listB = await request('/api/me/recent-views', bearer(tokenB))
  assert.deepEqual(listA.body.data, [])
  assert.equal(listB.body.data.length, 1)
})

// ===================== Journal de lecture =====================
// (bloc à AJOUTER À LA FIN de backend/tests/api.test.js, sans rien supprimer)

function jsonRequest(method, payload) {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }
}

function putStatus(token, bookId, status) {
  return request(`/api/me/reading-log/${bookId}`, bearer(token, jsonRequest('PUT', { status })))
}

test('Les routes /api/me/reading-log exigent une connexion : 401', async () => {
  const calls = [
    ['/api/me/reading-log', undefined],
    ['/api/me/reading-log/1', undefined],
    ['/api/me/reading-log/1', jsonRequest('PUT', { status: 'read' })],
    ['/api/me/reading-log/1', { method: 'DELETE' }],
  ]
  for (const [path, options] of calls) {
    const { status } = await request(path, options)
    assert.equal(status, 401, `${path} sans jeton devrait renvoyer 401`)
  }
})

test('Le statut est enregistré, modifié sans doublon et relu', async () => {
  const token = (await registerAccount()).body.data.token
  const [bookId] = await firstBookIds(1)

  const first = await putStatus(token, bookId, 'want_to_read')
  assert.equal(first.status, 200)
  assert.equal(first.body.data.status, 'want_to_read')

  const second = await putStatus(token, bookId, 'reading')
  assert.equal(second.body.data.status, 'reading')

  const entry = await request(`/api/me/reading-log/${bookId}`, bearer(token))
  assert.equal(entry.status, 200)
  assert.equal(entry.body.data.status, 'reading')

  const list = await request('/api/me/reading-log', bearer(token))
  assert.equal(list.body.data.length, 1)
  assert.equal(list.body.data[0].id, bookId)
  assert.equal(list.body.data[0].status, 'reading')
  assert.ok(list.body.data[0].title && list.body.data[0].category)
})

test('Journal : statut, id ou filtre invalides 400, livre inexistant 404', async () => {
  const token = (await registerAccount()).body.data.token
  const [bookId] = await firstBookIds(1)

  const badBodies = [{ status: 'termine' }, { status: ['read'] }, { status: 5 }, {}]
  for (const payload of badBodies) {
    const { status } = await request(
      `/api/me/reading-log/${bookId}`,
      bearer(token, jsonRequest('PUT', payload)),
    )
    assert.equal(status, 400, `devrait refuser : ${JSON.stringify(payload)}`)
  }

  const noBody = await request(`/api/me/reading-log/${bookId}`, bearer(token, { method: 'PUT' }))
  assert.equal(noBody.status, 400)

  for (const value of ['abc', '0', '-1']) {
    const { status } = await putStatus(token, value, 'read')
    assert.equal(status, 400, `bookId=${value} devrait renvoyer 400`)
  }

  const missing = await putStatus(token, 999999, 'read')
  assert.equal(missing.status, 404)

  const badFilter = await request('/api/me/reading-log?status=termine', bearer(token))
  assert.equal(badFilter.status, 400)
})

test('Les dates de début et de fin suivent le statut', async () => {
  const token = (await registerAccount()).body.data.token
  const [bookId] = await firstBookIds(1)
  const datePattern = /^\d{4}-\d{2}-\d{2}$/

  const reading = (await putStatus(token, bookId, 'reading')).body.data
  assert.match(reading.started_at, datePattern)
  assert.equal(reading.finished_at, null)

  const read = (await putStatus(token, bookId, 'read')).body.data
  assert.equal(read.started_at, reading.started_at)
  assert.match(read.finished_at, datePattern)

  const wantToRead = (await putStatus(token, bookId, 'want_to_read')).body.data
  assert.equal(wantToRead.finished_at, null)
})

test('Le journal de lecture est privé à chaque compte', async () => {
  const tokenA = (await registerAccount()).body.data.token
  const tokenB = (await registerAccount()).body.data.token
  const [bookId] = await firstBookIds(1)

  await putStatus(tokenA, bookId, 'read')

  const listA = await request('/api/me/reading-log', bearer(tokenA))
  const listB = await request('/api/me/reading-log', bearer(tokenB))
  assert.equal(listA.body.data.length, 1)
  assert.deepEqual(listB.body.data, [])

  // B ne voit pas le statut de A
  const entryB = await request(`/api/me/reading-log/${bookId}`, bearer(tokenB))
  assert.equal(entryB.body.data, null)

  // B ne peut rien supprimer chez A
  const deleteB = await request(`/api/me/reading-log/${bookId}`, bearer(tokenB, { method: 'DELETE' }))
  assert.equal(deleteB.body.data.deleted, 0)

  // Le statut de B ne modifie pas celui de A
  await putStatus(tokenB, bookId, 'abandoned')
  const entryA = await request(`/api/me/reading-log/${bookId}`, bearer(tokenA))
  assert.equal(entryA.body.data.status, 'read')
})

test('Retirer un livre du journal est idempotent', async () => {
  const token = (await registerAccount()).body.data.token
  const [bookId] = await firstBookIds(1)
  await putStatus(token, bookId, 'reading')

  const first = await request(`/api/me/reading-log/${bookId}`, bearer(token, { method: 'DELETE' }))
  assert.equal(first.status, 200)
  assert.equal(first.body.data.deleted, 1)

  const again = await request(`/api/me/reading-log/${bookId}`, bearer(token, { method: 'DELETE' }))
  assert.equal(again.status, 200)
  assert.equal(again.body.data.deleted, 0)

  const entry = await request(`/api/me/reading-log/${bookId}`, bearer(token))
  assert.equal(entry.body.data, null)
})

test('Le journal peut être filtré par statut', async () => {
  const token = (await registerAccount()).body.data.token
  const [a, b, c] = await firstBookIds(3)

  await putStatus(token, a, 'reading')
  await putStatus(token, b, 'read')
  await putStatus(token, c, 'read')

  const all = await request('/api/me/reading-log', bearer(token))
  assert.equal(all.body.data.length, 3)

  const read = await request('/api/me/reading-log?status=read', bearer(token))
  assert.equal(read.body.data.length, 2)
  assert.ok(read.body.data.every((entry) => entry.status === 'read'))

  const abandoned = await request('/api/me/reading-log?status=abandoned', bearer(token))
  assert.deepEqual(abandoned.body.data, [])
})

// ===================== Favoris du compte =====================
// (bloc à AJOUTER À LA FIN de backend/tests/api.test.js)

const byNumber = (x, y) => x - y

function putFavorite(token, bookId) {
  return request(`/api/me/favorites/${bookId}`, bearer(token, { method: 'PUT' }))
}

async function listFavoriteIds(token) {
  const { body } = await request('/api/me/favorites', bearer(token))
  return body.data
}

test('Les routes /api/me/favorites exigent une connexion : 401', async () => {
  const calls = [
    ['/api/me/favorites', undefined],
    ['/api/me/favorites/1', { method: 'PUT' }],
    ['/api/me/favorites/1', { method: 'DELETE' }],
    ['/api/me/favorites/import', jsonRequest('POST', { bookIds: [1] })],
  ]
  for (const [path, options] of calls) {
    const { status } = await request(path, options)
    assert.equal(status, 401, `${path} sans jeton devrait renvoyer 401`)
  }
})

test('Un favori est ajouté sans doublon, listé puis retiré', async () => {
  const token = (await registerAccount()).body.data.token
  const [a, b] = await firstBookIds(2)

  assert.deepEqual(await listFavoriteIds(token), [])

  assert.equal((await putFavorite(token, a)).status, 200)
  assert.equal((await putFavorite(token, a)).status, 200) // idempotent
  assert.equal((await putFavorite(token, b)).status, 200)
  assert.deepEqual((await listFavoriteIds(token)).sort(byNumber), [a, b].sort(byNumber))

  const first = await request(`/api/me/favorites/${a}`, bearer(token, { method: 'DELETE' }))
  assert.equal(first.status, 200)
  assert.equal(first.body.data.deleted, 1)

  const again = await request(`/api/me/favorites/${a}`, bearer(token, { method: 'DELETE' }))
  assert.equal(again.status, 200)
  assert.equal(again.body.data.deleted, 0)

  assert.deepEqual(await listFavoriteIds(token), [b])
})

test('Favoris : id invalide 400, livre inexistant 404', async () => {
  const token = (await registerAccount()).body.data.token

  for (const value of ['abc', '0', '-1']) {
    const { status } = await putFavorite(token, value)
    assert.equal(status, 400, `bookId=${value} devrait renvoyer 400`)
  }

  assert.equal((await putFavorite(token, 999999)).status, 404)
})

test('Les favoris sont privés à chaque compte', async () => {
  const tokenA = (await registerAccount()).body.data.token
  const tokenB = (await registerAccount()).body.data.token
  const [bookId] = await firstBookIds(1)

  await putFavorite(tokenA, bookId)

  assert.deepEqual(await listFavoriteIds(tokenA), [bookId])
  assert.deepEqual(await listFavoriteIds(tokenB), [])

  // B ne peut rien retirer chez A
  const deleteB = await request(`/api/me/favorites/${bookId}`, bearer(tokenB, { method: 'DELETE' }))
  assert.equal(deleteB.body.data.deleted, 0)
  assert.deepEqual(await listFavoriteIds(tokenA), [bookId])
})

test('Import des favoris locaux : fusion sans doublon, ids inexistants ignorés', async () => {
  const token = (await registerAccount()).body.data.token
  const [a, b, c] = await firstBookIds(3)

  await putFavorite(token, a) // déjà favori avant l'import

  const imported = await request(
    '/api/me/favorites/import',
    bearer(token, jsonRequest('POST', { bookIds: [a, b, c, 999999] })),
  )
  assert.equal(imported.status, 200)
  assert.deepEqual([...imported.body.data].sort(byNumber), [a, b, c].sort(byNumber))

  // Un import vide ne change rien
  const empty = await request('/api/me/favorites/import', bearer(token, jsonRequest('POST', { bookIds: [] })))
  assert.equal(empty.status, 200)
  assert.equal(empty.body.data.length, 3)

  const invalidBodies = [
    {},
    { bookIds: '1' },
    { bookIds: [0] },
    { bookIds: [-1] },
    { bookIds: ['1'] },
    { bookIds: [1.5] },
    { bookIds: [2147483648] },
    { bookIds: Array(501).fill(1) },
  ]
  for (const payload of invalidBodies) {
    const { status } = await request(
      '/api/me/favorites/import',
      bearer(token, jsonRequest('POST', payload)),
    )
    assert.equal(status, 400, `devrait refuser : ${JSON.stringify(payload).slice(0, 60)}`)
  }

  const noBody = await request('/api/me/favorites/import', bearer(token, { method: 'POST' }))
  assert.equal(noBody.status, 400)
})

// ===================== Notes =====================
// (bloc à AJOUTER À LA FIN de backend/tests/api.test.js)

function putNote(token, bookId, payload) {
  return request(`/api/me/notes/${bookId}`, bearer(token, jsonRequest('PUT', payload)))
}

test('Les routes /api/me/notes exigent une connexion : 401', async () => {
  const calls = [
    ['/api/me/notes', undefined],
    ['/api/me/notes/1', undefined],
    ['/api/me/notes/1', jsonRequest('PUT', { rating: 4 })],
    ['/api/me/notes/1', { method: 'DELETE' }],
  ]
  for (const [path, options] of calls) {
    const { status } = await request(path, options)
    assert.equal(status, 401, `${path} sans jeton devrait renvoyer 401`)
  }
})

test('Une note est enregistrée, modifiée sans doublon, relue et listée', async () => {
  const token = (await registerAccount()).body.data.token
  const [a, b] = await firstBookIds(2)

  const first = await putNote(token, a, { rating: 4, content: 'Très bon livre' })
  assert.equal(first.status, 200)
  assert.equal(first.body.data.rating, 4)
  assert.equal(first.body.data.content, 'Très bon livre')

  const second = await putNote(token, a, { rating: 5, content: 'Finalement, un chef-d\'œuvre' })
  assert.equal(second.body.data.rating, 5)

  await putNote(token, b, { rating: 3 })

  const one = await request(`/api/me/notes/${a}`, bearer(token))
  assert.equal(one.status, 200)
  assert.equal(one.body.data.rating, 5)
  assert.equal(one.body.data.content, 'Finalement, un chef-d\'œuvre')

  // Une seule note par livre, la plus récemment modifiée en premier
  const list = await request('/api/me/notes', bearer(token))
  assert.equal(list.body.data.length, 2)
  assert.deepEqual(list.body.data.map((note) => note.id), [b, a])
  assert.ok(list.body.data[0].title && list.body.data[0].category)
  assert.equal(list.body.data[0].content, null)

  // Un livre non noté : data est null (ce n'est pas une erreur)
  const [, , c] = await firstBookIds(3)
  const none = await request(`/api/me/notes/${c}`, bearer(token))
  assert.equal(none.status, 200)
  assert.equal(none.body.data, null)
})

test('Note : étoiles seules, commentaire seul, texte nettoyé', async () => {
  const token = (await registerAccount()).body.data.token
  const [a, b] = await firstBookIds(2)

  const trimmed = await putNote(token, a, { content: '  Bien  ' })
  assert.equal(trimmed.status, 200)
  assert.equal(trimmed.body.data.content, 'Bien')
  assert.equal(trimmed.body.data.rating, null)

  const onlyStars = await putNote(token, b, { rating: 2, content: '   ' })
  assert.equal(onlyStars.status, 200)
  assert.equal(onlyStars.body.data.rating, 2)
  assert.equal(onlyStars.body.data.content, null)

  // Remplacer par un commentaire seul retire les étoiles
  const replaced = await putNote(token, b, { content: 'Plus d\'étoiles' })
  assert.equal(replaced.body.data.rating, null)
})

test('Note : données invalides 400, id invalide 400, livre inexistant 404', async () => {
  const token = (await registerAccount()).body.data.token
  const [bookId] = await firstBookIds(1)

  const invalidBodies = [
    {},
    { rating: null, content: '   ' },
    { rating: 0 },
    { rating: 6 },
    { rating: 2.5 },
    { rating: '3' },
    { rating: true },
    { content: 5 },
    { content: ['a'] },
    { rating: 3, content: 'a'.repeat(2001) },
  ]
  for (const payload of invalidBodies) {
    const { status } = await putNote(token, bookId, payload)
    assert.equal(status, 400, `devrait refuser : ${JSON.stringify(payload).slice(0, 60)}`)
  }

  const noBody = await request(`/api/me/notes/${bookId}`, bearer(token, { method: 'PUT' }))
  assert.equal(noBody.status, 400)

  for (const value of ['abc', '0', '-1']) {
    const { status } = await putNote(token, value, { rating: 3 })
    assert.equal(status, 400, `bookId=${value} devrait renvoyer 400`)
  }

  assert.equal((await putNote(token, 999999, { rating: 3 })).status, 404)
})

test('Les notes sont privées à chaque compte', async () => {
  const tokenA = (await registerAccount()).body.data.token
  const tokenB = (await registerAccount()).body.data.token
  const [bookId] = await firstBookIds(1)

  await putNote(tokenA, bookId, { rating: 5, content: 'Note de A' })

  const listB = await request('/api/me/notes', bearer(tokenB))
  assert.deepEqual(listB.body.data, [])

  const noteB = await request(`/api/me/notes/${bookId}`, bearer(tokenB))
  assert.equal(noteB.body.data, null)

  // B ne peut rien supprimer chez A
  const deleteB = await request(`/api/me/notes/${bookId}`, bearer(tokenB, { method: 'DELETE' }))
  assert.equal(deleteB.body.data.deleted, 0)

  // La note de B ne modifie pas celle de A
  await putNote(tokenB, bookId, { rating: 1, content: 'Note de B' })
  const noteA = await request(`/api/me/notes/${bookId}`, bearer(tokenA))
  assert.equal(noteA.body.data.rating, 5)
  assert.equal(noteA.body.data.content, 'Note de A')
})

test('Supprimer une note est idempotent', async () => {
  const token = (await registerAccount()).body.data.token
  const [bookId] = await firstBookIds(1)
  await putNote(token, bookId, { rating: 4 })

  const first = await request(`/api/me/notes/${bookId}`, bearer(token, { method: 'DELETE' }))
  assert.equal(first.status, 200)
  assert.equal(first.body.data.deleted, 1)

  const again = await request(`/api/me/notes/${bookId}`, bearer(token, { method: 'DELETE' }))
  assert.equal(again.status, 200)
  assert.equal(again.body.data.deleted, 0)

  const note = await request(`/api/me/notes/${bookId}`, bearer(token))
  assert.equal(note.body.data, null)
})

// ===================== Objectif de lecture =====================
// (bloc à AJOUTER À LA FIN de backend/tests/api.test.js)

const goalPath = (year) => `/api/me/reading-goals/${year}`

function getGoal(token, year) {
  return request(goalPath(year), bearer(token))
}

function putGoal(token, year, payload) {
  return request(goalPath(year), bearer(token, jsonRequest('PUT', payload)))
}

// Marque un livre « Déjà lu » et retourne l'année de fin de lecture posée par le serveur
async function readBookAndGetYear(token, bookId) {
  const read = await putStatus(token, bookId, 'read')
  return Number(read.body.data.finished_at.slice(0, 4))
}

test('Les routes /api/me/reading-goals exigent une connexion : 401', async () => {
  const calls = [
    [goalPath(2026), undefined],
    [goalPath(2026), jsonRequest('PUT', { target: 10 })],
    [goalPath(2026), { method: 'DELETE' }],
  ]
  for (const [path, options] of calls) {
    const { status } = await request(path, options)
    assert.equal(status, 401, `${path} sans jeton devrait renvoyer 401`)
  }
})

test("L'objectif est enregistré, modifié, et la progression compte les livres lus", async () => {
  const token = (await registerAccount()).body.data.token
  const [a, b, c] = await firstBookIds(3)

  const year = await readBookAndGetYear(token, a)
  await readBookAndGetYear(token, b)
  await putStatus(token, c, 'reading') // en cours : ne compte pas

  // Sans objectif : target est null, mais la progression est déjà calculée
  const empty = await getGoal(token, year)
  assert.equal(empty.status, 200)
  assert.deepEqual(empty.body.data, { year, target: null, read: 2 })

  const created = await putGoal(token, year, { target: 12 })
  assert.equal(created.status, 200)
  assert.deepEqual(created.body.data, { year, target: 12, read: 2 })

  const updated = await putGoal(token, year, { target: 20 })
  assert.deepEqual(updated.body.data, { year, target: 20, read: 2 })

  // Un livre qui n'est plus « Déjà lu » ne compte plus
  await putStatus(token, b, 'want_to_read')
  const afterChange = await getGoal(token, year)
  assert.deepEqual(afterChange.body.data, { year, target: 20, read: 1 })
})

test('Chaque année a son propre objectif et sa propre progression', async () => {
  const token = (await registerAccount()).body.data.token
  const [bookId] = await firstBookIds(1)
  const year = await readBookAndGetYear(token, bookId)

  assert.equal((await putGoal(token, year, { target: 10 })).status, 200)
  assert.equal((await putGoal(token, year - 1, { target: 5 })).status, 200)

  const current = await getGoal(token, year)
  const previous = await getGoal(token, year - 1)
  assert.deepEqual(current.body.data, { year, target: 10, read: 1 })
  // Le livre a été lu cette année : il ne compte pas pour l'année précédente
  assert.deepEqual(previous.body.data, { year: year - 1, target: 5, read: 0 })
})

test('Objectif : année invalide 400, objectif invalide 400', async () => {
  const token = (await registerAccount()).body.data.token

  for (const year of ['abc', '1999', '2101', '20x6', '02026', '-2026', '2026.5']) {
    const getResult = await getGoal(token, year)
    assert.equal(getResult.status, 400, `GET année ${year} devrait renvoyer 400`)
    const putResult = await putGoal(token, year, { target: 10 })
    assert.equal(putResult.status, 400, `PUT année ${year} devrait renvoyer 400`)
  }

  const invalidBodies = [
    {},
    { target: 0 },
    { target: -3 },
    { target: 1001 },
    { target: 2.5 },
    { target: '5' },
    { target: null },
    { target: true },
    { target: [5] },
  ]
  for (const payload of invalidBodies) {
    const { status } = await putGoal(token, 2026, payload)
    assert.equal(status, 400, `devrait refuser : ${JSON.stringify(payload)}`)
  }

  const noBody = await request(goalPath(2026), bearer(token, { method: 'PUT' }))
  assert.equal(noBody.status, 400)
})

test("L'objectif et la progression sont privés à chaque compte", async () => {
  const tokenA = (await registerAccount()).body.data.token
  const tokenB = (await registerAccount()).body.data.token
  const [bookId] = await firstBookIds(1)

  const year = await readBookAndGetYear(tokenA, bookId)
  await putGoal(tokenA, year, { target: 12 })

  // B ne voit ni l'objectif ni les lectures de A
  const goalB = await getGoal(tokenB, year)
  assert.deepEqual(goalB.body.data, { year, target: null, read: 0 })

  // B ne peut rien supprimer chez A
  const deleteB = await request(goalPath(year), bearer(tokenB, { method: 'DELETE' }))
  assert.equal(deleteB.body.data.deleted, 0)

  // L'objectif de B ne modifie pas celui de A
  await putGoal(tokenB, year, { target: 3 })
  const goalA = await getGoal(tokenA, year)
  assert.deepEqual(goalA.body.data, { year, target: 12, read: 1 })
})

test("Supprimer l'objectif est idempotent", async () => {
  const token = (await registerAccount()).body.data.token
  await putGoal(token, 2026, { target: 10 })

  const first = await request(goalPath(2026), bearer(token, { method: 'DELETE' }))
  assert.equal(first.status, 200)
  assert.equal(first.body.data.deleted, 1)

  const again = await request(goalPath(2026), bearer(token, { method: 'DELETE' }))
  assert.equal(again.status, 200)
  assert.equal(again.body.data.deleted, 0)

  const goal = await getGoal(token, 2026)
  assert.equal(goal.body.data.target, null)
})

// ===================== Livres PDF : administration, lecture, progression =====================

// Un PDF minimal (une page vide) : suffit pour tester l'envoi
const MINI_PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF',
)

// Compte administrateur : on promeut directement dans la base (comme le ferait le propriétaire du site)
async function registerAdmin() {
  const { account, body } = await registerAccount()
  await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [body.data.user.id])
  return { account, token: body.data.token }
}

// Formulaire multipart pour créer un livre (pdf facultatif)
function bookForm({ withPdf = true, title = 'Livre de test PDF' } = {}) {
  const form = new FormData()
  form.append('title', title)
  form.append('author', 'Auteur Test')
  form.append('category_id', '1')
  if (withPdf) form.append('pdf', new Blob([MINI_PDF], { type: 'application/pdf' }), 'livre.pdf')
  return form
}

async function createTestBook(adminToken, options) {
  const response = await fetch(`${BASE_URL}/api/admin/books`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: bookForm(options),
  })
  return { status: response.status, body: await response.json() }
}

test('Le rôle est "user" par défaut et visible dans /api/auth/me', async () => {
  const { body } = await registerAccount()
  assert.equal(body.data.user.role, 'user')

  const me = await request('/api/auth/me', bearer(body.data.token))
  assert.equal(me.body.data.user.role, 'user')
})

test('Les routes /api/admin exigent une connexion (401) puis le rôle admin (403)', async () => {
  const calls = [
    ['/api/admin/books', { method: 'POST' }],
    ['/api/admin/books/1', { method: 'PUT' }],
    ['/api/admin/books/1', { method: 'DELETE' }],
  ]
  const userToken = (await registerAccount()).body.data.token

  for (const [path, options] of calls) {
    const anonymous = await request(path, options)
    assert.equal(anonymous.status, 401, `${options.method} ${path} sans jeton`)

    const asUser = await request(path, bearer(userToken, options))
    assert.equal(asUser.status, 403, `${options.method} ${path} avec un compte normal`)
  }
})

test("L'administrateur crée, modifie puis supprime un livre avec son PDF", async () => {
  const { token } = await registerAdmin()

  const created = await createTestBook(token)
  assert.equal(created.status, 201)
  assert.equal(created.body.data.has_pdf, true)
  assert.equal('pdf_path' in created.body.data, false, 'le nom du fichier PDF ne doit pas fuiter')
  const id = created.body.data.id

  const form = new FormData()
  form.append('title', 'Titre modifié')
  const updated = await fetch(`${BASE_URL}/api/admin/books/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  const updatedBody = await updated.json()
  assert.equal(updated.status, 200)
  assert.equal(updatedBody.data.title, 'Titre modifié')
  assert.equal(updatedBody.data.has_pdf, true, 'le PDF est conservé si on ne le remplace pas')

  const deleted = await request(`/api/admin/books/${id}`, bearer(token, { method: 'DELETE' }))
  assert.equal(deleted.status, 200)

  const gone = await request(`/api/books/${id}`)
  assert.equal(gone.status, 404)
})

test('Création : un faux PDF, un titre vide ou une catégorie inconnue sont refusés (400)', async () => {
  const { token } = await registerAdmin()

  const fakePdf = bookForm({ withPdf: false })
  fakePdf.append('pdf', new Blob(['ceci n\'est pas un PDF'], { type: 'application/pdf' }), 'faux.pdf')
  const badFile = await fetch(`${BASE_URL}/api/admin/books`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fakePdf,
  })
  assert.equal(badFile.status, 400)

  const noTitle = new FormData()
  noTitle.append('author', 'A')
  noTitle.append('category_id', '1')
  const missingTitle = await fetch(`${BASE_URL}/api/admin/books`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: noTitle,
  })
  assert.equal(missingTitle.status, 400)

  const badCategory = bookForm({ withPdf: false })
  badCategory.set('category_id', '999999')
  const unknownCategory = await fetch(`${BASE_URL}/api/admin/books`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: badCategory,
  })
  assert.equal(unknownCategory.status, 400)
})

test('Le PDF d\'un livre exige une connexion et se télécharge intact', async () => {
  const { token: adminToken } = await registerAdmin()
  const { body: created } = await createTestBook(adminToken)
  const id = created.data.id

  try {
    const anonymous = await request(`/api/books/${id}/pdf`)
    assert.equal(anonymous.status, 401)

    const userToken = (await registerAccount()).body.data.token
    const response = await fetch(`${BASE_URL}/api/books/${id}/pdf`, bearer(userToken))
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'application/pdf')
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), MINI_PDF)
  } finally {
    await request(`/api/admin/books/${id}`, bearer(adminToken, { method: 'DELETE' }))
  }
})

test('Un livre sans PDF : 404 sur /pdf et has_pdf = false', async () => {
  const { token: adminToken } = await registerAdmin()
  const { body: created } = await createTestBook(adminToken, { withPdf: false })
  const id = created.data.id

  try {
    assert.equal(created.data.has_pdf, false)
    const userToken = (await registerAccount()).body.data.token
    const { status } = await request(`/api/books/${id}/pdf`, bearer(userToken))
    assert.equal(status, 404)
  } finally {
    await request(`/api/admin/books/${id}`, bearer(adminToken, { method: 'DELETE' }))
  }
})

test('Les routes /api/me/reading-progress exigent une connexion : 401', async () => {
  const calls = [
    ['/api/me/reading-progress', undefined],
    ['/api/me/reading-progress/1', undefined],
    ['/api/me/reading-progress/1', { method: 'PUT' }],
    ['/api/me/reading-progress/1', { method: 'DELETE' }],
  ]
  for (const [path, options] of calls) {
    const { status } = await request(path, options)
    assert.equal(status, 401, `${path} sans jeton devrait renvoyer 401`)
  }
})

test('La dernière page lue est mémorisée, mise à jour sans doublon et privée', async () => {
  const tokenA = (await registerAccount()).body.data.token
  const tokenB = (await registerAccount()).body.data.token
  const [id] = await firstBookIds(1)
  const path = `/api/me/reading-progress/${id}`

  // Jamais ouvert : pas de progression
  assert.equal((await request(path, bearer(tokenA))).body.data, null)

  assert.equal((await request(path, bearer(tokenA, jsonRequest('PUT', { page: 5, totalPages: 20 })))).status, 200)
  // Le nombre total de pages est conservé si on ne le renvoie pas
  await request(path, bearer(tokenA, jsonRequest('PUT', { page: 8 })))

  const progress = (await request(path, bearer(tokenA))).body.data
  assert.equal(progress.last_page, 8)
  assert.equal(progress.total_pages, 20)

  const history = (await request('/api/me/reading-progress', bearer(tokenA))).body.data
  assert.equal(history.length, 1)
  assert.equal(history[0].id, id)
  assert.equal(history[0].last_page, 8)

  // Rien chez l'autre compte
  assert.equal((await request(path, bearer(tokenB))).body.data, null)
  assert.deepEqual((await request('/api/me/reading-progress', bearer(tokenB))).body.data, [])
})

test('Progression : page invalide 400, livre inexistant 404', async () => {
  const token = (await registerAccount()).body.data.token
  const [id] = await firstBookIds(1)

  for (const payload of [{ page: 0 }, { page: -1 }, { page: '3' }, { page: 1.5 }, {}, { page: 9, totalPages: 5 }]) {
    const { status } = await request(`/api/me/reading-progress/${id}`, bearer(token, jsonRequest('PUT', payload)))
    assert.equal(status, 400, `${JSON.stringify(payload)} devrait renvoyer 400`)
  }

  const missing = await request('/api/me/reading-progress/999999', bearer(token, jsonRequest('PUT', { page: 1 })))
  assert.equal(missing.status, 404)
})


// ===================== Catégories : ajout par l'administrateur =====================

test('POST /api/admin/categories exige une connexion (401) puis le rôle admin (403)', async () => {
  const anonymous = await request('/api/admin/categories', jsonRequest('POST', { name: 'Test' }))
  assert.equal(anonymous.status, 401)

  const userToken = (await registerAccount()).body.data.token
  const asUser = await request('/api/admin/categories', bearer(userToken, jsonRequest('POST', { name: 'Test' })))
  assert.equal(asUser.status, 403)
})

test("L'administrateur ajoute une catégorie : espaces nettoyés, doublon refusé, nom vide refusé", async () => {
  const { token } = await registerAdmin()
  const name = `Catégorie test ${Date.now()}`

  try {
    const created = await request('/api/admin/categories', bearer(token, jsonRequest('POST', { name: `  ${name}  ` })))
    assert.equal(created.status, 201)
    assert.equal(created.body.data.name, name)

    // Elle apparaît dans la liste publique
    const list = await request('/api/categories')
    assert.ok(list.body.data.some((category) => category.id === created.body.data.id))

    // Même nom, même en majuscules : refusé (409)
    const duplicate = await request('/api/admin/categories', bearer(token, jsonRequest('POST', { name: name.toUpperCase() })))
    assert.equal(duplicate.status, 409)

    // Nom vide, absent, trop long ou pas du texte : refusé (400)
    for (const payload of [{ name: '   ' }, {}, { name: 'x'.repeat(101) }, { name: 42 }]) {
      const invalid = await request('/api/admin/categories', bearer(token, jsonRequest('POST', payload)))
      assert.equal(invalid.status, 400, `${JSON.stringify(payload).slice(0, 40)} devrait renvoyer 400`)
    }
  } finally {
    await pool.query('DELETE FROM categories WHERE lower(name) = lower($1)', [name])
  }
})


// ===================== Auteurs =====================

// Un PNG de 1 pixel : suffit pour tester l'envoi d'une photo
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

// Formulaire d'auteur (la photo est facultative)
function authorForm(fields = {}, { withPhoto = false } = {}) {
  const form = new FormData()
  for (const [key, value] of Object.entries({ name: 'Auteur Fiche Test', ...fields })) {
    form.append(key, value)
  }
  if (withPhoto) form.append('photo', new Blob([TINY_PNG], { type: 'image/png' }), 'photo.png')
  return form
}

async function sendAuthor(token, method, path, form) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  return { status: response.status, body: await response.json() }
}

test('GET /api/authors renvoie une liste ; id invalide 400, inconnu 404', async () => {
  const { status, body } = await request('/api/authors')
  assert.equal(status, 200)
  assert.ok(Array.isArray(body.data))
  for (const author of body.data) {
    assert.ok(author.id && author.name)
    assert.equal(typeof author.books_count, 'number')
  }

  assert.equal((await request('/api/authors/abc')).status, 400)
  assert.equal((await request('/api/authors/999999')).status, 404)
})

test('Les routes /api/admin/authors exigent une connexion (401) puis le rôle admin (403)', async () => {
  const calls = [
    ['/api/admin/authors', 'POST'],
    ['/api/admin/authors/1', 'PUT'],
    ['/api/admin/authors/1', 'DELETE'],
  ]
  const userToken = (await registerAccount()).body.data.token

  for (const [path, method] of calls) {
    assert.equal((await request(path, { method })).status, 401, `${method} ${path} sans jeton`)
    assert.equal((await request(path, bearer(userToken, { method }))).status, 403, `${method} ${path} compte normal`)
  }
})

test("Cycle complet d'un auteur : création, livres retrouvés par le nom, modification, suppression", async () => {
  const { token } = await registerAdmin()
  const name = `Zoé Fiche ${Date.now()}`
  let authorId = null
  let bookId = null

  try {
    // Création avec photo, dates et infos personnelles
    const created = await sendAuthor(
      token,
      'POST',
      '/api/admin/authors',
      authorForm(
        { name: `  ${name}  `, biography: 'Une vie.\nDeux lignes.', birth_date: '1913-11-07', death_date: '1960-01-04', birth_place: 'Mondovi', nationality: 'Française' },
        { withPhoto: true },
      ),
    )
    assert.equal(created.status, 201)
    authorId = created.body.data.id
    assert.equal(created.body.data.name, name, 'espaces superflus retirés')
    assert.equal(created.body.data.birth_date, '1913-11-07', 'la date reste un texte AAAA-MM-JJ')
    assert.equal(created.body.data.biography, 'Une vie.\nDeux lignes.')
    assert.ok(created.body.data.photo_path)

    // La photo est servie publiquement
    const photoUrl = `${BASE_URL}/uploads/authors/${created.body.data.photo_path}`
    const photo = await fetch(photoUrl)
    assert.equal(photo.status, 200)
    assert.equal(photo.headers.get('content-type'), 'image/png')

    // Elle apparaît sur la liste publique (sans aucun livre pour l'instant)
    const list = await request('/api/authors')
    const inList = list.body.data.find((author) => author.id === authorId)
    assert.ok(inList)
    assert.equal(inList.books_count, 0)

    // Un livre dont l'auteur porte ce nom (majuscules et accents différents) devient une de ses œuvres
    const bookForm2 = bookForm({ withPdf: false, title: 'Œuvre de test auteur' })
    bookForm2.set('author', name.toUpperCase().replace('É', 'E'))
    const book = await fetch(`${BASE_URL}/api/admin/books`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: bookForm2,
    })
    bookId = (await book.json()).data.id

    const detail = await request(`/api/authors/${authorId}`)
    assert.equal(detail.status, 200)
    assert.deepEqual(detail.body.data.books.map((b) => b.id), [bookId])
    assert.ok(detail.body.data.books[0].category, 'même format que le catalogue (BookGrid)')
    assert.equal((await request('/api/authors')).body.data.find((a) => a.id === authorId).books_count, 1)

    // Doublon (majuscules/accents ignorés), dates invalides, photo qui n'en est pas une
    assert.equal((await sendAuthor(token, 'POST', '/api/admin/authors', authorForm({ name: name.toUpperCase() }))).status, 409)
    assert.equal((await sendAuthor(token, 'POST', '/api/admin/authors', authorForm({ name: 'Date X', birth_date: '2020-02-31' }))).status, 400)
    assert.equal((await sendAuthor(token, 'POST', '/api/admin/authors', authorForm({ name: 'Date Y', birth_date: '1950-01-01', death_date: '1940-01-01' }))).status, 400)
    assert.equal((await sendAuthor(token, 'POST', '/api/admin/authors', authorForm({ name: '   ' }))).status, 400)
    const fake = authorForm({ name: 'Faux Y' })
    fake.append('photo', new Blob(['pas une image'], { type: 'image/png' }), 'faux.png')
    assert.equal((await sendAuthor(token, 'POST', '/api/admin/authors', fake)).status, 400)

    // Modification : texte seul (la photo est conservée), puis nouvelle photo (l'ancienne disparaît)
    const partial = new FormData() // un seul champ envoyé : les autres gardent leur valeur
    partial.append('nationality', 'Algérienne')
    const edited = await sendAuthor(token, 'PUT', `/api/admin/authors/${authorId}`, partial)
    assert.equal(edited.status, 200)
    assert.equal(edited.body.data.nationality, 'Algérienne')
    assert.equal(edited.body.data.name, name, 'le nom absent du formulaire est conservé')
    assert.equal(edited.body.data.birth_date, '1913-11-07', 'la date absente est conservée')
    assert.equal(edited.body.data.photo_path, created.body.data.photo_path, 'photo conservée')

    const replaced = await sendAuthor(token, 'PUT', `/api/admin/authors/${authorId}`, authorForm({ name }, { withPhoto: true }))
    assert.notEqual(replaced.body.data.photo_path, created.body.data.photo_path)
    assert.equal((await fetch(photoUrl)).status, 404, 'ancienne photo supprimée du disque')

    const removed = await sendAuthor(token, 'PUT', `/api/admin/authors/${authorId}`, authorForm({ name, remove_photo: 'true' }))
    assert.equal(removed.body.data.photo_path, null)

    // Suppression : la fiche disparaît mais le livre reste dans le catalogue
    const deleted = await request(`/api/admin/authors/${authorId}`, bearer(token, { method: 'DELETE' }))
    assert.equal(deleted.status, 200)
    assert.equal((await request(`/api/authors/${authorId}`)).status, 404)
    assert.equal((await request(`/api/books/${bookId}`)).status, 200)
    authorId = null
  } finally {
    if (bookId) await request(`/api/admin/books/${bookId}`, bearer(token, { method: 'DELETE' }))
    if (authorId) await request(`/api/admin/authors/${authorId}`, bearer(token, { method: 'DELETE' }))
    await pool.query('DELETE FROM authors WHERE name = ANY($1)', [[name, 'Date X', 'Date Y', 'Faux Y']])
  }
})
