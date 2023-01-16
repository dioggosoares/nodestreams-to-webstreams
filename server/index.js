import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { Readable, Transform } from 'node:stream'
import { WritableStream, TransformStream } from 'node:stream/web'
import { setTimeout } from 'node:timers/promises'
import csvtojson from 'csvtojson'

// curl -N localhost:3333
// curl -i -X OPTIONS -N localhost:3333

const PORT = 3333
createServer(async (req, res) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': '*',
  }

  if(req.methods === 'OPTIONS') {
    res.writeHead(204, headers)
    res.end()
    return
  }

  let items = 0
  req.once('close', _ => console.log(`connection was closed!`, items))
  
  Readable.toWeb(createReadStream('./animeflv.csv'))
  // o passo a passo que cada item individual vai trafegar
  .pipeThrough(Transform.toWeb(csvtojson()))
  .pipeThrough(new TransformStream({
    transform(chunk, controller) {
      const data = JSON.parse(Buffer.from(chunk))
      const mappedData = {
        title: data.title,
        description: data.description,
        url_anime: data.url_anime,
      }
      // concatenando com quebra de linha pois é um NDJSON
      controller.enqueue(JSON.stringify(mappedData).concat('\n'))
    }
  }))
  // pipeTo é para a última etapa
  .pipeTo(new WritableStream({
    async write(chunk) {
      await setTimeout(200)
      items ++
      res.write(chunk)
    },
    close() {
      res.end()
    }
  }))

  res.writeHead(200, headers)
})
.listen(PORT)
.on('listening', _ => console.log(`server is running at ${PORT}`)) 