
async function * produce (...xs) {
  for await (const x of xs)
    yield x
}

// const empty = () => produce()
async function * empty () {}


// const id = (x) => concat(x)
async function * id (x) {
  yield * x
}

async function * concat (...xss) {
  for (const xs of xss)
    yield * xs
}

async function * flatten (xss) {
  for await (const xs of xss)
    yield * xs
}

function map (f) {
  return async function * (xs, {signal}=sig()) {
    let i = 0
    for await (const x of xs)
      yield await f(x, i++, {signal})
  }
}

function filter (f) {
  return async function * (xs, {signal}=sig()) {
    let i = 0
    for await (const x of xs)
      if (f(x, i++, {signal}))
        yield x
  }
}

function reduce (f, z) {
  return async function * (xs, {signal}=sig()) {
    let i = 0, y = z
    for await (const x of xs)
      y = f(y, x, i++, {signal})

    yield y
  }
}

async function * capture (xs) {
  yield * reduce((xs, x) => { xs.push(x); return xs }, [])(xs)
}

capture.promise = async function (xs) {
  let X
  for await (const x of capture(xs))
    X = x

  return X
}

async function * sink (xs) {
  const { done } = await xs.return()
  if (!done)
    yield * unwind(xs)
}

async function * unwind (xs) {
  for await (const _ of xs) ;
}

function compose (...fs) {
  return async function * (xs, {signal}=sig()) {
    yield * fs.reduce((ys, f) => f(ys, {signal}), xs)
  }
}


module.exports = { produce, empty, id, concat, flatten, map, filter, reduce, capture, sink, unwind, compose }

function sig () {
  const signal = (new AbortController).signal
  return  {signal}
}
