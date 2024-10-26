
const {setTimeout} = require('node:timers/promises')

const async = require('../lib/async.js')


async function * run (reach=[]) {
  try {
    // before
    reach.push('b1')
    await setTimeout(200)
    reach.push('b2')
    yield 1
    reach.push('b3')
    await setTimeout(200)
    reach.push('b4')
    yield 2
    reach.push('b5')
  }
  finally {
    // after
    reach.push('a1')
    await setTimeout(200)
    reach.push('a2')
    yield 3
    reach.push('a3')
  }
}

async function read (xs) {
  const X = []
  for await (const x of xs)
    X.push(x)
  
  return X
}

module.exports = function (test, assert) {

  test('async/baseline', async () => {
    const R  = []
    const xs = await read(run(R))

    assert.same(xs, [1,2,3])
    assert.same(R, ['b1','b2','b3','b4','b5','a1','a2','a3'])
  })


  test('async/id', async () => {
    const xs = await read(async.id(run()))
    
    assert.same(xs, [1,2,3])
  })


  test('async/map', async () => {
    const xs = await read(async.filter((x,i)=> x % 2 === 1 && i > 0)(run()))
    
    assert.same(xs, [3])
  })


  test('async/filter', async () => {
    const xs = await read(async.map((x,i)=>[i,2*x])(run()))
    
    assert.same(xs, [[0,2],[1,4],[2,6]])
  })


  test('async/reduce', async () => {
    const S = await read(async.reduce((s,x) => s+x, 0)(run()))

    assert.same(S, [6])
  })


  test('async/capture', async () => {
    const x = await read(async.capture(run()))
    assert.same(x, [[1,2,3]])
  })


  test('async/promise', async () => {
    const x = await async.capture.promise(run())
    assert.same(x, [1,2,3])
  })


  test('async/flatten', async () => {
    const xx = await read(async.flatten(async.map(x => [x,x])(run())))
    assert.same(xx, [1,1,2,2,3,3])
  })


  test('async/produce', async () => {
    const x = await read(async.produce(4,5,6))
    assert.same(x, [4,5,6])
  })


  test('async/produce/promise', async () => {
    const p = setTimeout(200).then(() => 'ok')
    const x = await read(async.produce(p))
    assert.same(x, ['ok'])
  })


  test('async/sink/full', async () => {
    const R  = []
    const xs = await read(async.sink(run(R)))

    assert.same(xs, [])
    assert.same(R , [])
  })


  test('async/sink/partial', async () => {
    const R = []
    const r = run(R)
    const d = await r.next()
    assert.same(d, {done: false, value: 1})

    const xs = await read(async.sink(r))
    assert.same(xs, [])
    assert.same(R, ['b1','b2','a1','a2','a3'])
  })


  test('async/unwind', async () => {
    const R  = []
    const xs = await read(async.unwind(run(R)))

    assert.same(xs, [])
    assert.same(R, ['b1','b2','b3','b4','b5','a1','a2','a3'])
  })


  test('async/compose', async () => {
    const F = async.compose(async.flatten, async.filter(x => x % 2), async.map(x => x * 2))
    const xs = await read(F([[1,2,3],[4,5,6]]))

    assert.same(xs, [2,6,10])
  })


  test('async/empty', async () => {
    const xs = await read(async.empty())

    assert.same(xs, [])
  })

}
