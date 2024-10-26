
const {setTimeout} = require('node:timers/promises')

const busy = require('../lib/busy.js')

module.exports = function (test, assert) {
  test('busy/regular', async () => {
    const log = []
    const [f, wait] = busy((x,y) => setTimeout(x).then(() => log.push(y)))

    f(100, 'a')
    f(100, 'b')

    await wait()

    assert.same(log, ['a', 'b'])
  })


  test('busy/errors', async () => {
    const log = []
    const E = new Error ('test')
    const [f, wait] = busy(() => setTimeout(100).then(() => { throw E }))

    const P = f().catch(e => log.push(e))

    await wait()
    await P

    assert.same(log, [E])
  })
}
