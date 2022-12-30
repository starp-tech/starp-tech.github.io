let didSyncCurrentPosition = false
new function() {
  const apiHost = "www.starpy.me"
  const apiURL = `https://${apiHost}/api/v1/`
  const partyListUrl = `${apiURL}party-list`
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
      const data = await (await fetch(instantPartyUrl())).json()
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
        && red.sync.syncData) {
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
    partyList = partyList.rows.map(i=>i.value)
    console.info(partyList)
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
      await getPartyMedia()
      await getCurrentMediaItem()
      await hideVideoPlayer()
      await setupPartyView()
      playMediaLink(
        currentExtract.url,
        currentMedia.currentPosition
        )
      window.location.hash = "#partyId="+partyId
      await createSocket()
    } catch(err) {
      console.error('startRandomMedia error', err)
      isLoadingParty = false
      isPlaying = false;
      startRandomMedia()
    }
    isLoadingParty = false
  }

  window.playPartyById = async (pid) => {
    clearTimeout(videoPlayerErrorTimeout)
    videoPlayerErrorTimeout = null;
    isLoadingParty = true;
    try {
      if(partyId)
        playedParties.push(partyId)
      console.info(playedParties)
      partyId = pid
      window.location.hash = "#partyId="+partyId
      await getPartyList()
      party = partyList.find(p=>p.id===partyId)
      console.info('playPartyById', partyId)
      await getPartyMedia()
      await getCurrentMediaItem()
      await hideVideoPlayer()
      await setupPartyView()
      playMediaLink(
        currentExtract.url,
        currentMedia.currentPosition
        )
      playerPlayButton.className = ""
      await createSocket()
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
      currentItem = partyMedia
        .find(i=>i.messageType === "party_media")
      currentExtract = currentItem.ex
      currentMedia = currentItem.media
  }
  const playAnotherParty = async (prev) => {
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
  const setupPartyView = () => {
    partyTitle.innerHTML = `${party.name} by ${party.partyUserName}`
    videoTitle.innerHTML = currentMedia.title
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

  joinRandomButton.addEventListener("click", joinRandomButtonClick)

  joinRandomButton2.addEventListener("click", joinRandomButtonClick)

  playNextPartyButton.addEventListener("click", (e)=>{
    clearTimeout(swipeTimeout) 
    swipeTimeout = setTimeout(pressNextParty, 300)
    return e.preventDefault()
  })
  playPrevPartyButton.addEventListener("click", (e)=>{
    clearTimeout(swipeTimeout) 
    swipeTimeout = setTimeout(pressPrevParty, 300)
    return e.preventDefault()
  })
  
  window.videoPlayerErrorTimeout = null;

  const videoPlayerErrorTimeoutTimer = 5000
  videoPlayer.onerror = (e, err) => {
    console.error("videoPlayerError", e, videoPlayer.error)

    if(videoContainer.className === "hidden") 
      return;
    if(!videoPlayer.error 
      || videoPlayer.error.message === 'MEDIA_ELEMENT_ERROR: Empty src attribute')
      return;

    if(currentMediaLink.search("magnet") > -1)
      return;

    clearTimeout(videoPlayerErrorTimeout)
    videoPlayerErrorTimeout = null;
    videoPlayerErrorTimeout = setTimeout(()=>{
      window.startRandomMedia()
    }, videoPlayerErrorTimeoutTimer)

  }
  const parsePartyQuery = async () => {
    const pid = hashStart.split("#partyId=")[1]
    console.info(hashStart, pid)
    try {
      playPartyById(pid)
    } catch(err) {
      console.info("pressJoinPublic err", err)
    }
  }

  if(hashStart 
    && hashStart.search("partyId") > -1) {
    parsePartyQuery()
  }
}