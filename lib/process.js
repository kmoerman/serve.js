
const crypto = require('node:crypto')
const util   = require('node:util')

const bytes  = util.promisify(crypto.randomBytes)

const call   = require('./call.js')

module.exports = process

async function process (logger, router, request, response) {
  const time = new Date ()
  const C = new call (request, response)

  const abort = new AbortController ()

  response.on('close', () => { (response.writableEnded && response.writableFinished) || abort.abort() })

  const {method, url, headers} = request
  const log_line = [method, url]

  try {
    const id = await bytes(16).then(id => id.toString('hex'))
    log_line.unshift(id)

    let route
    try {
      route = await router.route({method, url, headers, id, signal: abort.signal})
      route = await Promise.all(array(route))
    } catch (error) {
      logger.error('serve:route-error', ...log_line, error)
      route = [{status:500, outgoing: ''}]
    }

    await C.run(route, {signal: abort.signal})

  } catch (error) {
    if (!response.headersSent)
      response.statusCode = 500

    response.end()

    logger.error('serve:response-error', ...log_line, error)

  } finally {
    logger.log(abort.signal.aborted ? 'serve:aborted' : 'serve:completed', ...log_line, response.statusCode, Date.now() - time)
  }

}

function array (x) {
  if (x === undefined)
    return []
  else if (x instanceof Array)
    return x
  else
    return [x]
}
