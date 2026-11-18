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