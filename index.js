const express = require("express")
const server = express()

const Web3 = require("web3")
const web3 = new Web3("https://polygon-rpc.com/")

let cache = {
  lastUpdate: 0,
  data: {}
}

let data = {
  lastBlock: 0,
  events: []
}

getData()

setInterval(async () => {
  await getData()
}, 60 * 1000 * 1000)

server.get("/", async (req, res) => {
    await calculate()
    res.json({
      error: false,
      day: cache.data.day,
      week: cache.data.week
     })
})

function calculate(){
  let day = 0
  let week = 0;
  for (i in data.events){
    if (data.lastBlock - data.events[i].blockNumber < 43200){
      day += data.events[i].returnValues.penalty / Math.pow(10, 18)
    } else if (data.lastBlock - data.events[i].blockNumber > 43200 && data.lastBlock - data.events[i].blockNumber < 302400){
      week += data.events[i].returnValues.penalty / Math.pow(10, 18)
    }
  }

  cache.lastUpdate = Date.now()
  cache.data = {
    day: day,
    week: week
  }
}

async function getData(){
  let contractInstance = new web3.eth.Contract(require("./ABI.json"), "0xef79881df640b42bda6a84ac9435611ec6bb51a4");
  let headBlock = (await web3.eth.getBlock("latest")).number

  let lastBlock = headBlock - (data.lastBlock > 0 ? data.lastBlock : 302400)
  let callsRequired = Math.ceil((headBlock - lastBlock) / 4000)

  data.lastBlock = headBlock

  let claims = []
  let hashes = []

  for (let i = 0; i < callsRequired; i++){
    //get recent deposit events
    try {
      console.log(`Call ${i} of ${callsRequired}`)
      let events = await contractInstance.getPastEvents('Claim', { fromBlock: lastBlock + (4000 * i), toBlock: lastBlock + (4000 * (i + 1)) })
      for (j in events){
        if (!hashes.includes(events[j].transactionHash)) {
          hashes.push(events[j].transactionHash)
          claims.push(events[j])
        }
      }
    } catch (e){
      console.log(`Error: ${e}`)
      i--;
    }
  }

  data.events.push(...claims)

  let sum = 0
  for (i in claims){
    sum += claims[i].returnValues.penalty / Math.pow(10, 18)
  }

  console.log(`Sum: ${sum}`)
}

server.listen(8080)
