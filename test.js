
const path = require('node:path')
const test = require('node:test')
const fs   = require('node:fs')

const assert = require('node:assert')
assert.same = assert.deepStrictEqual
const args = process.argv.slice(2)
if (args.length === 0)
  args.push('')
const rgx = new RegExp (`^${args.map(arg => `(${arg.replaceAll('.', '\\.')}.*)`).join('|')}`)

async function glob (pattern, options) {
  const paths = []
  for await (const entry of fs.promises.glob(pattern, options))
    paths.push(entry)
  
  return paths
}

function slash (f) {
  return f.replaceAll('\\', '/')
}

function runFile (file, test, assert) {
  try {
    return require(file)(test, assert)
  } catch (e) {
    return test(`setup ${file}`, () => {throw e})
  }
}

async function runTest (file) {
  const name = slash(path.relative(path.join(__dirname, 'test'), file))
  if (rgx.test(name))
    runFile(`./test/${name}`, test, assert)
}

const pattern = slash(path.relative('.', path.join(__dirname, 'test/**/*.js')))
glob(pattern, {})
  .then(files => Promise.all(files.map(runTest)))

// reach 100% coverage on this file
runFile(':__fake', (name, run) => {try { run() } catch (e) {}})
