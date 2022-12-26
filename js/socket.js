
let didSyncCurrentPosition = false
new function() {
  const apiHost = "www.starpy.me"
  const apiURL = `https://${apiHost}/api/v1/`
  const partyListUrl = `${apiURL}party-list`
  const partyMediaUrl = () => 
    `${apiURL}party-one/?partyId=${partyId}`
  const partySyncUrl = () => 
    `${apiURL}party-one/?partyId=${partyId}&messageType=party_media_sync`
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
  let timeJoined;
  const shuffle = (array) => {
    let currentIndex = array.length,  randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex != 0) {

      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;

      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }

    return array;
  }
  const getPartyMedia = async () => {
    try {
      didSyncCurrentPosition = false
      const [f, s] = 
        await Promise.all([
          fetch(partyMediaUrl()), 
          fetch(partySyncUrl())
        ])
      const [partyData, syncMessage] = 
        await Promise.all([f.json(), s.json()])
      if(partyData.results[0]) {
        partyMedia = [partyData.results[0]._default]
      }
      else {
        partyMedia = []
      }
      console.info('syncMessage', syncMessage)
      if(syncMessage 
        && syncMessage.results[0]
        && syncMessage.results[0]._default
        && syncMessage.results[0]._default.syncData) {
        didSyncCurrentPosition = true
        const {syncData} = syncMessage.results[0]._default
        currentPosition = syncData.percent
      }
      console.info("partyMedia", partyMedia)
    } catch(err) {
      console.error("getPartyMedia error", err)
      partyMedia = []
    }
  }

  const getLastPartyMessage = async () => {
    const url = partyLastUrl()
    const f = await fetch(url)
    const json = await f.json()
    const lastMessage = json.results[0]._default
    console.info(lastMessage)
    if(lastMessage.chatId === partyId) {
      console.info('message for this chat', partyId, lastMessage.chatId, partyId === lastMessage.chatId)
    }
  }

  const getPartyList = async () => {
    partyList = await (await fetch(partyListUrl)).json()
    partyList = partyList.rows.map(i=>i.value)
    console.info(partyList)
  }
  
  const createSocket = async () => {
    
    timeJoined = new Date().valueOf()
    if(currentSocket) {
      currentSocket.send(JSON.stringify({
        name: username, 
        partyId, 
        chatId:partyId,
        userId
      }));

      return
    }
    
    const ws = new WebSocket(socketUrl);

    ws.addEventListener("open", event => {
      console.info('ws opened')
      currentSocket = ws
      currentSocket.send(JSON.stringify({
        name: username, 
        partyId, 
        chatId:partyId,
        userId
      }));
    });

    ws.addEventListener("message", async (event) => {
      // console.info('new party message', event)
      // await getLastPartyMessage()
      if(event.data) {
        const data = JSON.parse(event.data)
        const {
          id, 
          chatId, 
          createdAt, 
          media,
          messageType,
          syncData
        } = data
        if(id === "sync" || chatId !== partyId)
          return;
        const messageTime = new Date(createdAt).valueOf()
        const now = new Date().valueOf()

        if(!createdAt || messageTime < timeJoined) {
          console.info('old party message', data)
          return
        }

        console.info('new party message', data, now, messageTime)
        let syncDiff = (now - messageTime) / 1000
        console.info(syncDiff)
        
        if(isNaN(syncDiff))
          syncDiff = 0

        if(media && media.id !== currentMedia.id) {
          partyMedia = [data]
          isPlaying = false
          await getCurrentMediaItem()
          setupPartyView()
          playMediaLink(
            currentExtract.url,
            currentMedia.currentPosition
          )
        }
        if(syncData) {
          currentPosition = syncData.percent
          const percent = 
            videoPlayer.duration * currentPosition
          const currentTime = percent+syncDiff
          console.info("currentTime", currentTime)
          videoPlayer.currentTime = currentTime
        }

      }
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
  window.startRandomMedia = async () => {
    if(isLoadingParty === true)
      return
    isLoadingParty = true;
    try {
      await getPartyList()
      if(playedParties.length > 5) playedParties = []
      party = shuffle(partyList)
        .find(p=>!playedParties.includes(p.id))
      partyId = party.id
      await getPartyMedia()
      await getCurrentMediaItem()
      await hideVideoPlayer()
      playedParties.push(partyId)
      await setupPartyView()
      playMediaLink(
        currentExtract.url,
        currentMedia.currentPosition
        )
    } catch(err) {
      console.error('startRandomMedia error', err)
      isLoadingParty = false
      isPlaying = false;
      startRandomMedia()
      return;
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

        party = shuffle(partyList).find(p=>!playedParties.includes(p.id))
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
      await createSocket()
      await getCurrentMediaItem()

      isPlaying = false
      await setupPartyView()
      playMediaLink(
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
    if (touchendX < touchstartX && isPlaying) pressNextParty()
    if (touchendX > touchstartX && isPlaying) pressPrevParty()
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
  videoPlayer.onerror = () => window.startRandomMedia()
}