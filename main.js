
const process = require('./lib/process.js')

module.exports = {http, https, listen}


function http (options) {
  return listen(require('node:http'), options)
}


function https (options) {
  return listen(require('node:https'), options)
}


function listen (protocol, {host, port, logger=silent, router, ...serverOptions}) {
  const [serve, wait] = busy(process.bind(null, logger, router))
  const server = protocol.createServer(serverOptions, serve)

  server.wait = wait

  return new Promise ((resolve, reject) => {
    server.listen(port, host)
    server.on('listening', () => resolve(server))
    server.on('error', e => server.close(() => reject(e)))
  })
}

const silent =
  { log  : () => {}
  , error: () => {}
  }
