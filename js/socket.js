let didSyncCurrentPosition = false
new function() {
  const apiHost = "www.starpy.me"
  const apiURL = `https://${apiHost}/api/v1/`
  const partyListUrl = `${apiURL}backend/party-list`
  const instantPartyUrl = () => 
    `${apiURL}backend/party-one?partyId=${partyId}`
  const partyMediaUrl = () => 
    `${apiURL}party-one/?partyId=${partyId}`
  const partySyncUrl = () => 
    `${apiURL}party-one/?partyId=${partyId}&messageType=party_media_sync`
  const socketUrl = `wss://${apiHost}/api/v1/backend/`

  const joinRandomButton = 
    document.getElementById("joinParty")
  const joinRandomButton2 = 
    document.getElementById("joinParty2")
  const playPrevPartyButton = 
    document.getElementById("playPrevParty")
  const playNextPartyButton = 
    document.getElementById("playNextParty")
  const partyTitle = 
    document.getElementById('partyTitle')
  const videoTitle = 
    document.getElementById('videoTitle')
  const chatContainer = 
    document.getElementById('chatContainer')
  let partyId;
  let currentSocket;
  let username = "anon"
  let userId = "anon"
  let partyList = [];
  let party;
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
      const data = await (
        await fetch(instantPartyUrl())
      ).json()
      console.info(data.results)
      let red = data
        .results
        .reduce((a, i)=>{
          return {...a, ...i}
        },{})
      console.info('red', red)

      party = red.party
      partyMedia = [red.media]
      didSyncCurrentPosition = false
      if(red.sync 
        && red.sync.syncData
        && new Date(red.sync.createdAt).valueOf() 
          > new Date(red.media.createdAt).valueOf()) {
        didSyncCurrentPosition = true
        currentPosition = red.sync.syncData.percent
      }
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
    partyList = partyList.results.map(i=>i._default)
    // console.info(partyList)
  }
  let socketCreatTimeout = null;
  const socketCreatTimeoutInterval = 20*1000
  const resetSocket = async () => {
      let lastSocket = currentSocket;
      clearTimeout(socketCreatTimeout)
      currentSocket = null;
      await lastSocket.close()
      lastSocket.destroy()
      createSocket()
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
      clearTimeout(socketCreatTimeout)
      // socketCreatTimeout = setTimeout(resetSocket, socketCreatTimeoutInterval)
    });

    ws.addEventListener("message", async (event) => {
      // console.info('new party message', event)
      // await getLastPartyMessage()
      if(event.data) {
        const data = JSON.parse(event.data)
        
        if(window.publicSocketCallback) {
          window.publicSocketCallback(data)
        }

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
          setupPartyView(party, currentMedia)
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
    const onClose = (event) => {
      if(!currentSocket)
        return;
      console.log("WebSocket closed, reconnecting:", event.code, event.reason);
      ws.removeEventListener("close", onClose)
      resetSocket()
    }
    ws.addEventListener("close", onClose);

    ws.addEventListener("error", event => {
      console.log("WebSocket error, reconnecting:", event);
      // rejoin();
    });
  }

  let isLoadingParty = false
  window.startRandomMedia = async () => {
    if(isLoadingParty === true)
      return
    clearTimeout(videoPlayerErrorTimeout)
    videoPlayerErrorTimeout = null;
    isLoadingParty = true;
    if(partyId)
      playedParties.push(partyId)
    try {
      await getPartyList()
      if(playedParties.length > 5) playedParties = []
      party = shuffle(partyList)
        .find(p=>!playedParties.includes(p.id))
      partyId = party.id
      window.playPartyById(partyId)
    } catch(err) {
      console.error('startRandomMedia error', err)
      isLoadingParty = false
      isPlaying = false;
      startRandomMedia()
    }
    isLoadingParty = false
  }

  window.playPartyById = async (pid, onlyChat) => {
    clearTimeout(videoPlayerErrorTimeout)
    videoPlayerErrorTimeout = null;
    isLoadingParty = true;
    try {
      partyId = pid
      await createSocket()
      if(!onlyChat) {
        if(partyId)
          playedParties.push(partyId)
        console.info(playedParties)
        window.location.hash = "#partyId="+partyId
        await getPartyMedia()
        partyList = [party]
        await getCurrentMediaItem()
        await hideVideoPlayer()
        await setupPartyView(party, currentMedia)
        playMediaLink(
          currentExtract.url,
          currentMedia.currentPosition
          )
        window.runStarpyChatEmbed({
          chatId:partyId, 
          width:chatContainer.offsetWidth, 
          height:chatContainer.offsetHeight
        }, "chatContainer")
      }
    } catch(err) {
      console.error('startRandomMedia error', err)
      isLoadingParty = false
      isPlaying = false;
      startRandomMedia()
    }
    isLoadingParty = false
  }
  const playerPlayButton = 
    document.getElementById("playerPlayButton")

  window.togglePlay = () => {
    if(videoPlayer.paused) {
      playerPlayButton.className = "hidden"
      videoPlayer.play()
    }
    else {
      playerPlayButton.className = ""
      videoPlayer.pause()
    }
  }

  const getCurrentMediaItem = () => {
      currentItem = partyMedia[0]
      currentExtract = currentItem.ex
      currentMedia = currentItem.media
  }
  const playAnotherParty = async (prev) => {
    playerPlayButton.className = "hidden"
    clearTimeout(videoPlayerErrorTimeout)
    videoPlayerErrorTimeout = null;
    try {

      if(prev) {
        const preParty = 
          playedParties.pop()
        
        if(preParty)
          await playPartyById(preParty)
        else 
          await startRandomMedia()
      }
      else {
        console.info('play next')
        await startRandomMedia()
      }
    } catch(err) {
      console.error('startRandomMedia error', err)
    }
    isLoadingParty = false
  }
  const pressNextParty = async () => {
    console.info('pressNextParty')
    isLoadingParty = false
    isPlaying = false
    playAnotherParty(false)
  }

  const pressPrevParty = async () => {
    console.info('pressPrevParty')
    isLoadingParty = false
    isPlaying = false
    playAnotherParty(true)
  }
  let touchendX = 0
  let swipeTimeout;

  function checkDirection() {
    if (touchendX < touchstartX && isPlaying) {
      clearTimeout(swipeTimeout) 
      swipeTimeout = setTimeout(pressNextParty, 300)
    }
    if (touchendX > touchstartX && isPlaying) {
      clearTimeout(swipeTimeout) 
      swipeTimeout = setTimeout(pressPrevParty, 300)
    }
  }

  if(videoContainer) {

    // document.addEventListener('touchstart', e => {
    //   touchstartX = e.changedTouches[0].screenX
    // })

    // document.addEventListener('touchend', e => {
    //   touchendX = e.changedTouches[0].screenX
    //   checkDirection()
    // })
    // videoContainer.addEventListener('touchstart', e => {
    //   touchstartX = e.changedTouches[0].screenX
    // })

    // videoContainer.addEventListener('touchend', e => {
    //   touchendX = e.changedTouches[0].screenX
    //   checkDirection()
    // })
    
    videoPlayer.addEventListener('touchend', e => {
      touchendX = e.changedTouches[0].screenX
      checkDirection()
    })

    videoPlayer.addEventListener('touchstart', e => {
      touchstartX = e.changedTouches[0].screenX
    })
  }


  const pressJoinPublic = async () => {
    console.info("pressJoinPublic start")
    isLoadingParty = false
    isPlaying = false
    try {
      startRandomMedia()
      await createSocket()
    } catch(err) {
      console.info("pressJoinPublic err", err)
    }
  }
  const joinRandomButtonClick = (e)=>{
    clearTimeout(swipeTimeout) 
    swipeTimeout = setTimeout(pressJoinPublic, 300)
    return e.preventDefault()
  }
  
  if(joinRandomButton)
    joinRandomButton.addEventListener("click", joinRandomButtonClick)
  
  if(joinRandomButton2)
    joinRandomButton2.addEventListener("click", joinRandomButtonClick)
  
  if(playNextPartyButton)
    playNextPartyButton.addEventListener("click", (e)=>{
      clearTimeout(swipeTimeout) 
      swipeTimeout = setTimeout(pressNextParty, 300)
      return e.preventDefault()
    })

  if(playPrevPartyButton)
    playPrevPartyButton.addEventListener("click", (e)=>{
      clearTimeout(swipeTimeout) 
      swipeTimeout = setTimeout(pressPrevParty, 300)
      return e.preventDefault()
    })
  
  window.videoPlayerErrorTimeout = null;

  videoPlayer.onerror = (e, err) => {
    console.error("videoPlayerError", e, videoPlayer.error)
  }
}