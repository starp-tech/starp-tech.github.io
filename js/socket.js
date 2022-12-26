new function() {
  const apiHost = "www.starpy.me"
  const partyListUrl = `https://${apiHost}/api/v1/party-list`
  const partyMediaUrl = () => 
    `https://${apiHost}/api/v1/party-media/?partyId="${partyId}"`
  const socketUrl = `wss://${apiHost}/api/v1/socket`

  const joinRandomButton = 
    document.getElementById("joinParty")
  const playPrevPartyButton = 
    document.getElementById("playPrevParty")
  const playNextPartyButton = 
    document.getElementById("playNextParty")
  const partyTitle = 
    document.getElementById('partyTitle')
  const videoTitle = 
    document.getElementById('videoTitle')
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
  let prevParty;
  let playedParties = []
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
    partyList = partyList.rows.map(i=>i.value)
    console.info(partyList)
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

  let isLoadingParty = false
  const startRandomMedia = async () => {
    if(isLoadingParty === true)
      return
    isLoadingParty = true;
    try {
      await getPartyList()
      party = partyList.find(p=>!playedParties.includes(p.id))
      partyId = party.id
      await getPartyMedia()
      await getCurrentMediaItem()
      await hideVideoPlayer()
      playedParties.push(partyId)
      await setupPartyView()
      await playMediaLink(
        currentExtract.url,
        currentMedia.currentPosition
        )
    } catch(err) {
      console.error('startRandomMedia error', err)
    }
    isLoadingParty = false
  }
  const getCurrentMediaItem = () => {

      currentItem = partyMedia
        .find(i=>i.messageType === "party_media")
      currentExtract = currentItem.ex
      currentMedia = currentItem.media
  }
  const playAnotherParty = async (prev) => {
    if(isLoadingParty === true)
      return
    isLoadingParty = true
    try {
      console.info("playAnotherParty")
      console.info('current party', party.id)
      if(!prev) {
        prevParty = party
        await getPartyList()
        
        if(playedParties.length === partyList.length)
          playedParties = []

        party = partyList.find(p=>!playedParties.includes(p.id))
        console.info('found a new party', party)
        partyId = party.id
        playedParties.push(partyId)
      }
      else {
        if(!prevParty) return playAnotherParty()
        party = prevParty
        partyId = party.id
        playedParties.pop()
      }

      await getPartyMedia()

      if(partyMedia.length === 0) {
        isLoadingParty = false
        return playAnotherParty(prev)
      }

      await getCurrentMediaItem()

      isPlaying = false
      await setupPartyView()
      await playMediaLink(
        currentExtract.url, 
        currentMedia.currentPosition
        )
    } catch(err) {
      console.error('startRandomMedia error', err)
    }
    isLoadingParty = false
  }
  const setupPartyView = () => {
    partyTitle.innerHTML = `${party.name} by ${party.partyUserName}`
    videoTitle.innerHTML = currentMedia.title
  }
  const pressNextParty = async () => {
    console.info('pressNextParty')
    playAnotherParty(false)
  }

  const pressPrevParty = async () => {
    console.info('pressPrevParty')
    playAnotherParty(true)
  }
  let touchendX = 0
    
  function checkDirection() {
    if (touchendX < touchstartX && isPlaying) pressPrevParty()
    if (touchendX > touchstartX && isPlaying) pressNextParty()
  }

  document.addEventListener('touchstart', e => {
    touchstartX = e.changedTouches[0].screenX
  })

  document.addEventListener('touchend', e => {
    touchendX = e.changedTouches[0].screenX
    checkDirection()
  })

  videoContainer.addEventListener('touchstart', e => {
    touchstartX = e.changedTouches[0].screenX
  })

  videoContainer.addEventListener('touchend', e => {
    touchendX = e.changedTouches[0].screenX
    checkDirection()
  })
  
  videoPlayer.addEventListener('touchend', e => {
    touchendX = e.changedTouches[0].screenX
    checkDirection()
  })

  videoPlayer.addEventListener('touchstart', e => {
    touchstartX = e.changedTouches[0].screenX
  })


  const pressJoinPublic = async () => {
    console.info("pressJoinPublic start")
    try {
      await startRandomMedia()
      await createSocket()
    } catch(err) {
      console.info("pressJoinPublic start", err)
    }
  }

  joinRandomButton.addEventListener("click", (e)=>{
    e.preventDefault()
    pressJoinPublic()
  })

  playNextPartyButton.addEventListener("click", (e)=>{
    e.preventDefault()
    pressNextParty()
  })
  playPrevPartyButton.addEventListener("click", (e)=>{
    e.preventDefault()
    pressPrevParty()
  })
}