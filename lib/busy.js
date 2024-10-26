
module.exports = busy

function busy (f) {
  let counter = 0, list = []

  async function wrapped (...xs) {
    counter++
    try {
      await f(...xs)
    }

    finally {
      counter--
      if (counter === 0) {
        if (list.length > 0) {
          const _list = list
          list = []
          _list.forEach(resolve => resolve())
        }
      }
    }
  }

  function wait () {
    return new Promise (resolve => list.push(resolve))
  }

  return [wrapped, wait]
}
