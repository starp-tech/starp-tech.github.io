new function() {
  const apiHost = "www.starpy.me"
  const partyListUrl = `https://${apiHost}/api/v1/party-list`
  const partyMediaUrl = (partyId) => 
    `https://${apiHost}/api/v1/party-media?partyId="${partyId}"`
  const socketUrl = `wss://${apiHost}/api/v1/socket`

  let currentSocket;
  let username = "anon"
  let userId = "anon"
  let partyList = [];
  let party;
  let partyId;
  let partyMedia;
  const createSocket = async () => {
    
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

    ws.addEventListener("message", event => {
      let data = JSON.parse(event.data);
      console.info('new party message', data)
    });

    ws.addEventListener("close", event => {
      console.log("WebSocket closed, reconnecting:", event.code, event.reason);
      createSocket()
    });

    ws.addEventListener("error", event => {
      console.log("WebSocket error, reconnecting:", event);
      // rejoin();
    });
  }

  const pressJoinPublic = async () => {
    console.info("pressJoinPublic start")
    try {
      partyList = (await (await fetch(partyListUrl)).json())
      [party] = partyList.rows
      partyId = party.id
      partyMedia = await fetch(partyMediaUrl())
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