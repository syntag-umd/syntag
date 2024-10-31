import fetch, {Headers} from "node-fetch"
import util from 'util';
import stream from 'stream';
const { Readable } = stream;

const pipeline = util.promisify(stream.pipeline);

const API_KEY = ""

export const handler = awslambda.streamifyResponse(async (event, responseStream, _context, )=>{

  //console.log("hello world!", event, "\n");
  const request_json = JSON.parse(event.body);


  const hostname = "syntag-eastus.openai.azure.com";
  const path = "/openai/deployments/gpt-4o-mini/chat/completions?api-version=2023-03-15-preview" ///api/HttpTrigger1
  const method = "POST";

  const headers = new Headers();
  headers.append('Content-Type', 'application/json');
  headers.append('api-key', API_KEY);
  const options = {
    method: method,
    headers: headers,
    body: JSON.stringify(request_json)
  };
  const start_time = Date.now()
  const response = await fetch(`https://${hostname}${path}`, options);
  console.log("First Chunk Unix Time: ", Date.now())
  const chunk_times = [Date.now()-start_time]

  if (response.status>=400){
    throw new Error(`Error: ${response.status} ${JSON.stringify(await response.json())}`)
  }


  const reader = response.body;
  reader.on('data', (chunk)=>{
    chunk_times.push(Date.now()-start_time)
    //console.log("Recieved "+ chunk)
  });
  reader.on('end',()=>{
    chunk_times.push(Date.now()-start_time)
    console.log(`Chunk times: ${JSON.stringify(chunk_times)}`)
  })
  await pipeline(reader, responseStream);


});
