new function() {
  const apiHost = "www.starpy.me"
  const partyListUrl = `https://${apiHost}/api/v1/party-list`
  const partyMediaUrl = () => 
    `https://${apiHost}/api/v1/party-media/?partyId="${partyId}"`
  const socketUrl = `wss://${apiHost}/api/v1/socket`

  let currentSocket;
  let username = "anon"
  let userId = "anon"
  let partyList = [];
  let party;
  let partyId;
  let partyMedia;
  let currentMedia;
  let currentItem;
  let currentExtract;

  const getPartyMedia = async () => {
    const url = partyMediaUrl()
    const f = await fetch(url)
    const partyData = await f.json()
    partyMedia = 
      partyData
      .rows
      .map(i=>i.value)
      .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))
    console.info("partyMedia", partyMedia)
  }

  const getPartyList = async () => {
    partyList = await (await fetch(partyListUrl)).json()
    console.info(partyList.rows)
  }
  
  const createSocket = async () => {
    
    if(currentSocket)
      return
    
    const ws = new WebSocket(socketUrl);

    ws.addEventListener("open", event => {
      console.info('ws opened')
      currentSocket = ws
      ws.send(JSON.stringify({
        name: username, 
        partyId, 
        userId
      }));
    });

    ws.addEventListener("message", async (event) => {
      console.info('new party message', event)
      // let data = JSON.parse(event.data);
      await getPartyMedia()
    });

    ws.addEventListener("close", event => {
      console.log("WebSocket closed, reconnecting:", event.code, event.reason);
      currentSocket.close()
      currentSocket = null;
      createSocket()
    });

    ws.addEventListener("error", event => {
      console.log("WebSocket error, reconnecting:", event);
      // rejoin();
    });
  }

  const startRandomMedia = async () => {
    await getPartyList()
    party = partyList.rows[0].value
    partyId = party.id
    await getPartyMedia()
    currentItem = partyMedia
      .find(i=>i.messageType === "party_media")
    currentExtract = currentItem.ex
    currentMedia = currentItem.media
    
    console.info("currentMedia", currentMedia)
    await hideVideoPlayer()
    await playMediaLink(currentExtract.url)
  }

  const pressJoinPublic = async () => {
    console.info("pressJoinPublic start")
    try {
      await startRandomMedia()
      await createSocket()
    } catch(err) {
      console.info("pressJoinPublic start", err)
    }
  }
  
  const button = document.getElementById("joinParty")
  
  button.addEventListener("click", (e)=>{
    e.preventDefault()
    pressJoinPublic()
  })
}