const {Readable}    = require('node:stream')
const {pipeline}    = require('node:stream/promises')
const {setTimeout}  = require('node:timers/promises')


function mapwait (time, f) {
  const list = []
  async function * map (xs, {signal}) {
    map.signal = signal

    for await (const x of xs) {
      await setTimeout(time, 0, {signal})
      list.push(x)
      yield await f(x)
    }
  }

  return Object.assign(map, {list, signal:undefined})
}


function capture () {
  const list = []
  async function capture (xs, {signal}) {
    capture.signal = signal

    for await (const x of xs) {
      list.push(x)
    }

    return list
  }

  return Object.assign(capture, {list, signal:undefined})
}


async function join (xs) {
  let X = ''
  for await (const x of xs)
    X += x

  return X
}


module.exports = function (test, assert) {

  const fail = assert.bind(null, false, 'should not reach')

  test('pipeline/regular', async () => {
    const input = ['a','b','c','d','e']
    const twice = x => x+x

    const delay   = 2000
    const interval = 100

    const M = mapwait(interval, twice)
    const C = capture()

    const ac = new AbortController
    setTimeout(delay).then(() => ac.abort())

    let Y
    try {
      Y = await pipeline(input, M, C)
    }
    finally {
      assert.same(Y, input.map(twice))
    }
  })


  test('pipeline/id/sync', async () => {
    const input = ['a','b','c','d','e']

    const C = capture()

    const Y = await pipeline(Readable.from(input), xs => xs, C)

    assert.same(Y, input)
  })


  test('pipeline/id/capture', async () => {
    const input = ['a','b','c','d','e']
    async function * run (xs) {
      yield * xs
    }
    const C = capture()

    const snoop = function (xs) {
      snoop.log.push(xs)
      return xs
    }
    snoop.log = []

    const Y = await pipeline(run(input), snoop, snoop, C)

    assert.same(Y, input)
    assert(snoop.log[0] === snoop.log[1])

  })


  test('pipeline/id/async', async () => {
    const input = ['a','b','c','d','e']

    const C = capture()

    const Y = await pipeline(Readable.from(input), async function * (xs) { yield * xs }, C)

    assert.same(Y, input)
  })


  test('pipeline/replace', async () => {
    const input = ['a','b','c','d','e']
    const output = [1,2,3,4,5,6]

    async function sink (xs) {
      for await (const x of xs) ;
    }

    const C = capture()

    const Y = await pipeline(Readable.from(input), async function * (xs) { await sink(xs); yield * output }, C)

    assert.same(Y, output)
  })


  test('pipeline/id/bad', async () => {
    const input = ['a','b','c','d','e']

    const C = capture()

    return pipeline(Readable.from(input), async xs => xs, C)
      .then(fail, e => assert(e.code === 'ERR_INVALID_RETURN_VALUE'))
  })


  test('pipeline/abort', async () => {
    const input = ['a','b','c','d','e']
    const twice = x => x+x
    
    const delay    = 2000
    const interval =  600

    const M = mapwait(interval, twice)
    const C = capture()

    const ac = new AbortController
    setTimeout(delay).then(() => ac.abort())

    return pipeline(input, M, C, {signal: ac.signal}).then(fail, e => assert(e.code === 'ABORT_ERR'))
      .finally(() => {
        const output = input.slice(0, Math.floor(delay/interval))
        assert.same(M.list, output)
        assert.same(C.list, output.map(twice))

        // signals were passed
        assert(M.signal instanceof AbortSignal)
        assert(C.signal instanceof AbortSignal)

        // signals were tirggered
        assert(M.signal.aborted)
        assert(C.signal.aborted)
        
        // internal sigals are different from external signal
        assert(M.signal !== ac.signal)
        assert(C.signal !== ac.signal)

        // internal signal is same everywhere
        assert(M.signal === C.signal)
      })

  })


  test('pipeline/promise/destination', async () => {
    const input = ['a','b','c','d','e']

    const X = await pipeline(input, join)
    assert.same(X, input.join(''))
  })


  test('pipeline/promise/invalid', async () => {
    const input = ['a','b','c','d','e']

    return pipeline(input, join, join).then(fail, e =>
      assert(e.code === 'ERR_INVALID_RETURN_VALUE'))
  })

}
