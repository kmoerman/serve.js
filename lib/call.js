
const {pipeline} = require('node:stream/promises')

const step = require('./step.js')
const async = require('./async.js')

module.exports = call

function call (request, response) {
  this.request  = request
  this.response = response

  this.status  = 200
  this.message = undefined
  this.headers = []
  this.after   = []
}

call.prototype.run = async function (list, signal={}) {
  const steps = list.map(x => step.from(x)).map(step => step.run.bind(step, this))

  const errors = []
  return pipeline(async.id(this.request), ...steps, this.writeStatus.bind(this), this.response, signal)
    .catch(e => errors.push(e))
    .finally(async () => {
      await this.after.reduce((p, f) => p.then(() => f()).catch(e => errors.push(e)), Promise.resolve())

      switch (errors.length) {
        case 0 : return
        case 1 : throw errors[0]
        default: throw new AggregateError (errors)
      }
    })
}

call.prototype.append = function (result) {
  const {status=this.status, message=this.messsage, headers=[], after=[]} = result

  this.status  = status
  this.message = message
  this.headers = [...this.headers, ...entries(headers)]
  this.after   = [...this.after, ...array(after)]
}

call.prototype.writeStatus = async function * (xs) {
  const {done,value} = await xs.next()

  this.response.statusCode = this.status
  if (this.message)
    this.response.statusMessage = this.message
  this.headers.forEach(([name, value]) => this.response.setHeader(name, value))

  if (done)
    return

  yield value
  yield * xs
}

function array (x) {
  return x instanceof Array ? x : [x]
}

function entries (x) {
  return x instanceof Array ? x : Object.entries(x)
}
