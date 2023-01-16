const API_URL = "http://localhost:3333"
let counter = 0

async function consumeApi(signal) {
  const response = await fetch(API_URL, {
    signal
  })
  const reader = response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(parseNDJSON())
  // .pipeTo(new WritableStream({
  //   write(chunk) {
  //     console.log(++counter, 'chunk', chunk)
  //   }
  // }))

  return reader
}

function appendToHTML(element) {
  return new WritableStream({
    write({ title, description, url_anime }) {
      const card = `
        <article>
          <div class="text">
            <h3>[${++counter}] ${title}</h3>
            <p>${shortenString(description, 100)}</p>
            <a href="${url_anime}">Here's why</a>
          </div>
        </article>
      `
      element.innerHTML += card
    },
    abort(reason) {
      console.log('aborted by user')
    }
  })
}

// essa função vai se certificar que se dois chunks cheguem em uma única transmissão
// conversa corretamente para JSON
// dado: {}\n{}
// deve
//    {}
//    {}
function parseNDJSON() {
  let ndjsonBuffer = ''
  return new TransformStream({
    transform(chunk, controller) {
      ndjsonBuffer += chunk
      const items = ndjsonBuffer.split('\n')
      items.slice(0, -1)
        .forEach(item => controller.enqueue(JSON.parse(item)))

      ndjsonBuffer = items[items.length - 1]
    },
    flush(controller) {
      if (!ndjsonBuffer) return
      controller.enqueue(JSON.parse(ndjsonBuffer))
    }
  })
}

function shortenString(str, limit) {
  // se astring é menor do que ou igual ao limit
  // só retorna a string sem o truncate.
  if (str?.length <= limit) {
    return str
  }
  // Retorna a string com truncat '...' concatenado com a string.
  return str?.slice(0, limit) + '...'
}

const [
  start,
  stop,
  cards
] = ['start', 'stop', 'cards'].map(item => document.getElementById(item))

let abortController = new AbortController()
start.addEventListener('click', async () => {
  const readable = await consumeApi(abortController.signal)
  readable.pipeTo(appendToHTML(cards))
})

stop.addEventListener('click', () => {
  abortController.abort()
  console.log('aborting...')
  abortController = new AbortController()
})