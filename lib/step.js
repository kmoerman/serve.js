
const stream = require('node:stream')

const async = require('./async.js')

module.exports = step

function step () {}

step.prototype.run = function (call, xs) {
  return xs
}

step.from = function (x) {
  if (typeof x === 'function') {
    switch (x.constructor.name) {
      case 'GeneratorFunction':
      case 'AsyncGeneratorFunction':
        return new step.generator (x)
      case 'AsyncFunction':
      case 'Function':
      default:
        return new step.function (x)
    }
  }

  if (x instanceof stream)
    return new step.generator (lift(x))

  if (x === undefined || x === null)
    return new step ()

  return new step.constant (x)
}

function lift (s) {
  return async function * (xs, {signal}) {
    if (s instanceof stream.Duplex) {
      yield * stream.compose(xs, s)
      return
    }
  
    if (s instanceof stream.Readable) {
      yield * async.sink(xs)
      yield * s
      return
    }
  
    if (s instanceof stream.Writable) {
      await stream.promises.pipeline(xs, s, {signal})
      return
    }
  }
}
// generator //////////////////////////////////////////////
// dependent on incoming stream, generator output
step.generator = function (f) {
  this.f = f
}

step.generator.prototype = Object.create(step.prototype)

step.generator.prototype.run = async function * (call, xs, {signal}) {
  yield * this.f(xs, {signal})
}


// constant ///////////////////////////////////////////////
// independent of incoming stream, any value
step.constant = function (value) {
  this.value = value
}

step.constant.prototype = Object.create(step.prototype)

step.constant.prototype.run = function (call, xs, {signal}) {
  const {outgoing, ...rest} = normalize(this.value)
  call.append(rest)

  if (outgoing)
    return async.concat(async.sink(xs), outgoing)
  else
    return xs
}


// function ///////////////////////////////////////////////
// dependent on incoming stream, any value
step.function = function (f) {
  this.f = f
}

step.function.prototype = Object.create(step.prototype)

step.function.prototype.run = async function * (call, xs, {signal}) {
  const value = await this.f.call(null, xs, {signal})
  const {outgoing, ...rest} = normalize(value)
  call.append(rest)

  if (outgoing)
    yield * outgoing
  else
    yield * async.empty()
}


// normalization utilities ////////////////////////////////
function normalize (x) {
  const normalized = {}
  switch (typeof x) {
    case 'object':
      if (Symbol.iterator in x || Symbol.asyncIterator in x)
        normalized.outgoing = iterator(x)
      else
        Object.assign(normalized, x, {outgoing: iterator(x.outgoing)})

      break

    default:
      normalized.outgoing = iterator(x)
      break
  }

  return normalized
}

function iterator (x) {
  switch (typeof x) {
    case 'undefined':
      return undefined

    case 'string':
      return async.id([x])

    case 'object':
      if (x === null)
        return undefined

      if (Symbol.asyncIterator in x)
        return x

      if (x instanceof Buffer)
        return async.id([x])

      if (Symbol.iterator in x)
        return async.id(x)

      // else fall through
    default:
      return async.id([x.toString()])
  }
}
