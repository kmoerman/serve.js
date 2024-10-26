
const call  = require('../lib/call.js')
const async = require('../lib/async.js')

const {setTimeout} = require('node:timers/promises')
const stream = require('node:stream')

function request (...input) {
  const req = stream.Readable.from(input)
  return req
}

function response () {
  const res = new stream.Writable (
    { write (chunk, encoding, callback) {
        this.capture.push([chunk, encoding])
        callback()
      }
    })
  
  Object.assign(res, { headers: []
    , capture: []
    , setHeader: function (name, value) { this.headers.push([name, value]) }
    })

  Object.defineProperty(res, 'body', { get () { return this.capture.reduce((b, [c]) => b+c, '') }})

  return res
}


module.exports = function (test, assert) {

  test('call/construction', async () => {
    const req = request  ('abc', 'def')
    const res = response ()

    const C = new call (req, res)

    assert(C instanceof call)
  })


  test('call/id', async () => {
    const req = request  ('abc', 'def')
    const res = response ()

    const C = new call (req, res)

    await C.run([])

    assert.same(res.body, 'abcdef')
    assert(res.statusCode === 200)
  })


  test('call/id/undefined', async () => {
    const req = request  ('abc', 'def')
    const res = response ()

    const C = new call (req, res)

    await C.run([undefined])

    assert.same(res.body, 'abcdef')
    assert(res.statusCode === 200)
  })


  test('call/id/null', async () => {
    const req = request  ('abc', 'def')
    const res = response ()

    const C = new call (req, res)

    await C.run([null])

    assert.same(res.body, 'abcdef')
    assert(res.statusCode === 200)
  })


  test('call/constant/primitive-string', async () => {
    const req = request  ('abc', 'def')
    const res = response ()

    const C = new call (req, res)

    await C.run(['response-body'])

    assert.same(res.body, 'response-body')
    assert(res.statusCode === 200)
  })


  test('call/constant/object-string', async () => {
    const req = request  ('abc', 'def')
    const res = response ()

    const C = new call (req, res)

    await C.run([new String ('response-body')])

    assert.same(res.body, 'response-body')
    assert(res.statusCode === 200)
  })


  test('call/constant/iterator', async () => {
    const req = request  ('abc', 'def')
    const res = response ()

    const C = new call (req, res)

    await C.run([['x','y','z']])

    assert.same(res.body, 'xyz')
    assert(res.statusCode === 200)
  })


  test('call/constant/async-iterator', async () => {
    const req = request  ('abc', 'def')
    const res = response ()

    const C = new call (req, res)

    await C.run([async.produce('x','y','z')])

    assert.same(res.body, 'xyz')
    assert(res.statusCode === 200)
  })


  test('call/constant/buffer', async () => {
    const req = request  ('abc', 'def')
    const res = response ()

    const C = new call (req, res)

    await C.run([Buffer.from('buffer the vampire slayer')])

    assert.same(res.body, 'buffer the vampire slayer')
    assert(res.statusCode === 200)
  })


  test('call/constant/number', async () => {
    const req = request  ('abc', 'def')
    const res = response ()

    const C = new call (req, res)

    await C.run([123])

    assert.same(res.body, '123')
    assert(res.statusCode === 200)
  })


  test('call/generator/readable', async () => {
    const req = request  ('abc','def')
    const res = response ()

    const C = new call (req, res)

    await C.run([stream.Readable.from(['uvw','xyz'])])

    assert.same(res.body, 'uvwxyz')
    assert(res.statusCode === 200)
  })


  test('call/generator/writable', async () => {
    const req = request  ('abc','def')
    const res = response ()

    const cap = response ()

    const C = new call (req, res)

    await C.run([cap])

    assert.same(res.body, '')
    assert(res.statusCode === 200)
    assert.same(cap.body, 'abcdef')
  })


  test('call/generator/duplex', async () => {
    const req = request  ('abc','def')
    const res = response ()

    const pas = new stream.PassThrough ()

    const C = new call (req, res)

    await C.run([pas])

    assert.same(res.body, 'abcdef')
    assert(res.statusCode === 200)
  })


  test('call/outgoing/status', async () => {
    const req = request  ('abc', 'def')
    const res = response ()

    const C = new call (req, res)

    await C.run([{status: 201, message: 'Created'}])

    assert.same(res.body, 'abcdef')
    assert(res.statusCode === 201)
    assert(res.statusMessage === 'Created')
  })


  test('call/outgoing/string', async () => {
    const req = request  ('abc', 'def')
    const res = response ()

    const C = new call (req, res)

    await C.run([{status: 201, outgoing: 'value'}])

    assert.same(res.body, 'value')
    assert(res.statusCode === 201)
  })


  test('call/outgoing/toString()', async () => {
    const req = request  ('abc', 'def')
    const res = response ()

    const C = new call (req, res)

    const X = {value: 'some-value', toString () { return this.value }}
    await C.run([{outgoing: X}])

    assert.same(res.body, X.value)
    assert(res.statusCode === 200)
  })


  test('call/outgoing/undefined', async () => {
    const req = request  ('abc', 'def')
    const res = response ()

    const C = new call (req, res)

    await C.run([{status: 201, message: 'Created', outgoing: undefined}])

    assert.same(res.body, 'abcdef')
    assert(res.statusCode === 201)
    assert(res.statusMessage === 'Created')
  })


  test('call/outgoing/null', async () => {
    const req = request  ('abc', 'def')
    const res = response ()

    const C = new call (req, res)

    await C.run([{status: 201, message: 'Created', outgoing: null}])

    assert.same(res.body, 'abcdef')
    assert(res.statusCode === 201)
    assert(res.statusMessage === 'Created')
  })


  test('call/function/sync-generator', async () => {
    const req = request  ('abc', 'def')
    const res = response ()

    const C = new call (req, res)

    await C.run([function * () { yield * ['uvw','xyz'] }])

    assert.same(res.body, 'uvwxyz')
    assert(res.statusCode === 200)
  })


  test('call/function/async-generator', async () => {
    const req = request  ('abc', 'def')
    const res = response ()

    const C = new call (req, res)

    await C.run([async function * () { yield * ['uvw','xyz'] }])

    assert.same(res.body, 'uvwxyz')
    assert(res.statusCode === 200)
  })


  test('call/function/promise', async () => {
    const req = request  ('abc','def')
    const res = response ()

    const C = new call (req, res)

    await C.run([async (xs) => 'ok'])

    assert.same(res.body, 'ok')
    assert(res.statusCode === 200)
  })


  test('call/function/empty', async () => {
    const req = request  ('abc','def')
    const res = response ()

    const C = new call (req, res)

    await C.run([async (xs) => ({status: 201})])

    assert.same(res.body, '')
    assert(res.statusCode === 201)
  })


  test('call/sequence/sink', async () => {
    const req = request  ('abc','def')
    const res = response ()

    const C = new call (req, res)

    await C.run([async.sink, async.produce('body', '-', 'ok')])

    assert.same(res.body, 'body-ok')
    assert(res.statusCode === 200)
  })


  test('call/sequence/json', async () => {
    const req = request  ('{"ke', 'y":"value"}')
    const res = response ()

    const C = new call (req, res)

    await C.run([async.reduce((a,b) => a + b, ''), async.map(JSON.parse), async.map(x => x.key)])

    assert.same(res.body, 'value')
    assert(res.statusCode === 200)
  })


  test('call/sequence/sink/after', async () => {
    const req = request  ('abc', 'def')
    const res = response ()

    const C = new call (req, res)

    await C.run([async.sink, {status: 201}])

    assert.same(res.body, '')
    assert(res.statusCode === 201)
  })


  test('call/sequence/sink/before', async () => {
    const req = request  ('abc', 'def')
    const res = response ()

    const C = new call (req, res)

    await C.run([{status: 201}, async.sink])

    assert.same(res.body, '')
    assert(res.statusCode === 201)
  })


  test('call/abort/no-signal', async () => {
    const req = request  ('abc', 'def', 'ghi')
    const res = response ()

    const C = new call (req, res)
    const abc = new AbortController
    let called = 0
    const p1 = C.run([async.map(x => setTimeout(300).then(() => { ++called; return x }))], {signal:abc.signal})
    const p2 = setTimeout(400).then(() => abc.abort())

    await Promise.all([p1, p2]).catch(e => assert(e.code === 'ABORT_ERR'))

    assert(called === 2, 'called twice')
    assert.same(res.body, 'abc')
  })


  test('call/abort/with-signal', async () => {
    const req = request  ('abc', 'def', 'ghi')
    const res = response ()

    let called = 0
    const xs = async.map((x,i,{signal}) => setTimeout(300, undefined, {signal}).then(() => { ++called; return x }))

    const abc = new AbortController
    const C = new call (req, res)
    const p1 = C.run([xs], {signal:abc.signal})
    const p2 = setTimeout(400).then(() => abc.abort())

    await Promise.all([p1, p2]).catch(e => assert(e.code === 'ABORT_ERR'))

    assert(called === 1, 'called once')
    assert.same(res.body, 'abc')
  })


  test('call/after', async () => {
    const req = request  ('abc', 'def')
    const res = response ()

    const C = new call (req, res)
    const log = []
    const E1 = new Error (1)
    const E2 = new Error (2)
    await C.run([ {after: () => setTimeout(200).then(() => { log.push('throw 1'); throw E1 })}
                , {after: () => setTimeout(100).then(() => { log.push('throw 2'); throw E2 })}
                ])
           .catch(e => log.push(e))

    assert.same(res.body, 'abcdef')
    assert.same(res.statusCode, 200)

    assert.same(log.slice(0,2), ['throw 1', 'throw 2'])
    assert(log.length === 3)
    assert(log[2] instanceof AggregateError)
    assert.same(log[2].errors, [E1, E2])
  })


  test('call/headers', async () => {
    const req = request  ('abc', 'def')
    const res = response ()

    const C = new call (req, res)
    const log = []
    await C.run([ { headers: {'Content-Type': 'application/test'}}
                , ''
                , { headers: [['X-Trace-Id', 'abc123']] }
                ])

    assert.same(res.body, '')
    assert.same(res.statusCode, 200)
    assert.same(res.headers, [['Content-Type', 'application/test'], ['X-Trace-Id', 'abc123']])
  })

}
