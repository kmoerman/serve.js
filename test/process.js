
const {setTimeout} = require('node:timers/promises')
const util = require('node:util')

const process = require('../lib/process.js')

function logger () {
  const log   = []
  const error = []

  return [{log: (...xs) => log.push(xs), error: (...xs) => error.push(xs)}, log, error]
}

function http (logger, router) {
  const http = require('http')
  
  const {promise:done, resolve, reject} = Promise.withResolvers()
  const server = http.createServer((request, response) =>
      process(logger, router, request, response).finally(() => server.close()).then(resolve, reject))

  const serving = util.promisify(server.listen.bind(server))(0, 'localhost')
    .then(() => `http://localhost:${server.address().port}`)

  return [serving, done]
}

module.exports = function (test, assert) {

  const fail = assert.bind(assert, false, 'should not reach')

  test('process/empty', async () => {
    const R = { route: () => {} }
    const [L, log, error] = logger()
    const [serving, done] = await(http(L, R))

    const url      = await serving
    const response = await fetch(url)
    const body     = await response.text()

    assert(response.status === 200)
    assert.same(body, '')

    await done
    assert.same(error, [])
  })


  test('process/basic', async () => {
    let ID
    const R = { route: ({id}) => { ID = id; return [{status: 201}, 'response body'] } }
    const [L, log, error] = logger()
    const [serving, done] = await(http(L, R))

    const url     = await serving
    const response = await fetch(url+'/test')
    const body     = await response.text()

    assert(response.status === 201)
    assert.same(body, 'response body')

    await done
    assert.same(error, [])
  })


  test('process/error/route', async () => {
    const E = new Error ()
    let ID
    const R = { route: ({id}) => { ID = id; return Promise.reject(E) } }
    const [L, log, error] = logger()
    const [serving, done] = http(L, R)

    const url      = await serving
    const response = await fetch(url+'/test/err')
    const body     = await response.text()

    assert(response.status === 500)
    assert.same(body, '')

    await done
    assert.same(error, [['serve:route-error', ID, 'GET', '/test/err', E]])
  })


  test('process/error/serve', async () => {
    const E = new Error ()
    let ID
    const R = { route: ({id}) => { ID = id; return async () => Promise.reject(E) } }
    const [L, log, error] = logger()
    const [serving, done] = http(L, R)

    const url = await serving
    await fetch(url+'/test/err')
      .then(fail, e => assert.same(e.message, 'fetch failed'))

    await done
    assert.same(error, [['serve:response-error', ID, 'GET', '/test/err', E]])
  })


  test('process/abort/route', async () => {
    let ID
    let E1
    const R = { route: ({id, signal}) => { ID = id; return setTimeout(300, 1, {signal}).catch(e => Promise.reject(E1 = e)) } }
    const [L, log, error] = logger()

    const [serving, done] = http(L, R)

    const url = await serving

    await fetch(url+'/test/abort', {signal: AbortSignal.timeout(100)})
      .then(fail, e => assert.same(e.message, 'The operation was aborted due to timeout'))

    await done
    assert(error.length === 2)
    const E2 = error[1].pop()
    assert.same(error,
      [ ['serve:route-error', ID, 'GET', '/test/abort', E1]
      , ['serve:response-error', ID, 'GET', '/test/abort']
      ])
    assert(E2 !== E1)
    assert(E2.code === 'ABORT_ERR')
  })

}
