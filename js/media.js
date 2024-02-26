let isPlaying = false
let registeredWorker = false;
let mediaWorker;
let mediaClient;
let prevMeshMedia = {}
let meshLinksAdded = {}
const videoLoadProgress = document.getElementById("videoLoadProgress")
const fileHackingSelectButton = document.getElementById("fileHackingSelectButton")
const fileHackingSelectButton2 = document.getElementById("fileHackingSelectButton2")
const hackingFileInput = document.getElementById("hackingFileInput")
window.currentMediaLink = "";
const mediaHosts = [
]
const rtcConfig = {
	"iceServers": [
    {
      "urls": [
        "stun:turn.starpy.me",
        "turn:turn.starpy.me"
      ],
      "username": "username1",
      "credential": "password1"
    }
  ],
  "sdpSemantics": "unified-plan",
  "bundlePolicy": "max-bundle",
  "iceCandidatePoolsize": 1
}
const setupPartyView = (party, currentMedia) => {
  if(party)
  	partyTitle.innerHTML = `${party.name} by ${party.partyUserName}`
  if(currentMedia)
	  videoTitle.innerHTML = currentMedia.title
}
const playMediaLink = async (mediaLink, currentPosition, filename) => {
	if(isPlaying)
		return
	currentMediaLink = mediaLink;
	videoLoadProgress.className = "hidden"
	isPlaying = true;
	
	try {
		
		if(mediaLink.search("magnet") > -1) {
			await playMesh(
				mediaLink, 
				currentPosition, 
				undefined, 
				undefined, 
				filename
			)
		} else {
			showVideoPlayer(mediaLink, currentPosition, filename)
		}

	} catch(err) {
		isPlaying = false
		console.error("playMediaLink err", err)
	}
}
let refreshMediaTimeout;
const refreshMediaTimeoutInterval = 5000;
const refreshMedia = (mediaLink, cb) => {
	console.info("refreshMedia", mediaLink)
	if(cb) cb()
}

const createMediaClient = (download) => {
	mediaClient = new WebTorrent({
		tracker:{
			rtcConfig
		}
	})
  mediaClient.on('error', function (err) {
    console.error('playMediaLink err: ' + err.message)
    // reject(err)
  })
	navigator.serviceWorker.register("/sw.min.js")
	.then(reg => {
	  const worker = reg.active || reg.waiting || reg.installing
	  function checkState (worker) {
	  	mediaWorker = worker
	    return worker.state === 'activated' 
	    	&& mediaClient.loadWorker(worker, download)
	  }
	  if (!checkState(worker)) {
	    mediaWorker.addEventListener('statechange', ({ target }) => checkState(target))
	  }
	})
	registeredWorker = true;
}
window.playMesh = async (
	mediaLink, 
	currentPosition, 
	blob, 
	onlyMedia,
	filename
) => 
	new Promise(async (resolve,reject)=> {

    if(!blob && !onlyMedia) 
    	showVideoPlayer("", 0)

		const play = async (media) => {
			
			if(onlyMedia)
				return resolve(media)

			if(!prevMeshMedia[mediaLink])
				prevMeshMedia[mediaLink] = media

	    if(media.files.length) {
				console.info('playMediaLink on media', media)
			  let file = media.files.find( (file) => (
				filename ? 
				file.name === filename :
				file.name.endsWith(".mp4") 
				|| file.name.endsWith(".webm") 
				|| file.name.endsWith(".mov")
			  ));
	      console.info('dling file', file)
	      if(!file && media.files.length) {
	      	file = media.files[0]
	      }
	      if(blob) {
				  media.on('download', ()=>updateSpeed(media))

	      	file.getBlobURL((err, url)=>{
		        console.log("download ready", url);
	        	resolve({fileName:file.name, url})
	        	return;
	      	})
	      	return;
	      }
			  media.on('download', ()=>updateVideoSpeed(media))

			  console.info('playMediaLink on file', file)
	      file.getStreamURL((err, url) => {
	        console.log("playMediaLink ready", url);
	        if(currentMediaLink === mediaLink) {
	          showVideoPlayer(url, currentPosition)
	          resolve(url)
	        }
	      });
	    }
		}
		if(prevMeshMedia[mediaLink]) {
			prevMeshMedia[mediaLink].resume()
			play(prevMeshMedia[mediaLink])
			return
		}
		const download = async () =>  {
			console.info('playMediaLink on download')
			if(meshLinksAdded[mediaLink]) {
				refreshMedia(mediaLink)
				return;
			}
			meshLinksAdded[mediaLink] = true
			refreshMediaTimeout = 
				setTimeout(refreshMedia, refreshMediaTimeoutInterval, mediaLink)
			videoLoadProgress.className = ""
			videoLoadProgress.innerHTML = "Connecting to peers"
			mediaClient.add(mediaLink, (media) => {
				try {
					play(media)
				} catch(err) {
					console.error("playMediaLink err", err)
				}
			})
		}
    if(mediaWorker && mediaClient) {
    	download()
    	return;
    }
    createMediaClient(download)
	})

const videoContainer = document.getElementById("videoContainer")
const videoPlayer = document.getElementById("videoPlayer")
const videoPlayerSource = document.getElementById("videoPlayerSource")
let currentPosition;


const showVideoPlayer = (mediaLink, cp) => {
	if(!didSyncCurrentPosition)
		currentPosition = cp

	videoPlayer.src = mediaLink
	videoContainer.className = ""
	document.body.className = document.body.className + " overflowHidden"
}

videoPlayer.addEventListener('loadedmetadata', (meta) => {
	console.info(meta)
	if(currentPosition) {
		const percent = 
			videoPlayer.duration * currentPosition
	  videoPlayer.currentTime = percent
	}
}, false);

videoPlayer.addEventListener("loadeddata", (data)=>{
	videoPlayer.play()
})

const updateSpeed = (media) => {
	try {
		if(media.done) {
			a.innerHTML = "Download File"
			return;
		}

	  const progress = (100 * media.progress).toFixed(1)
	  const peers = media.numPeers
	  a.innerHTML = "Loading "+progress+"% from "+peers+" peers"
	} catch(err) {
		console.error('updateSpeed error', err)
	}
}

const updateVideoSpeed = (media) => {
	try {
		
		if(media.magnetURI !== currentMediaLink)
			return;

	  const progress = (100 * media.progress).toFixed(1)
	  const peers = media.numPeers
	  videoLoadProgress.innerHTML = "Buffered "+progress+"% from "+peers+" peers"
	} catch(err) {
		console.error('updateSpeed error', err)
	}
}

const hideVideoPlayer = (e) => {
	if(videoContainer.className === "hidden")
		return
	document.body.className = ""
	videoPlayer.src = ""
	videoContainer.className = "hidden"
	isPlaying = false;
	if(windowClosedCallback)
		windowClosedCallback()
	if(e)
		return e.preventDefault()
}

const isScreenLockSupported = () => ('wakeLock' in navigator);

const getScreenLock = async () => {
  try {
	  if(isScreenLockSupported()){
	    let screenLock = await navigator.wakeLock.request('screen');
	    console.info('screenLock', screenLock)
	  }
  } catch(err) {
     console.log(err.name, err.message);
  }
}


function dragElement(elmnt) {
	var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
	if (videoPlayer) {
	  // if present, the header is where you move the DIV from:
	  videoPlayer.onmousedown = dragMouseDown;
	} else {
	  // otherwise, move the DIV from anywhere inside the DIV:
	  elmnt.onmousedown = dragMouseDown;
	}
  
	function dragMouseDown(e) {
	  e = e || window.event;
	  e.preventDefault();
	  
	  // get the mouse cursor position at startup:
	  pos3 = e.clientX;
	  pos4 = e.clientY;
	  document.onmouseup = closeDragElement;
	  // call a function whenever the cursor moves:
	  document.onmousemove = elementDrag;
	}
  
	function elementDrag(e) {
	  e = e || window.event;
	  e.preventDefault();
	  // calculate the new cursor position:
	  pos1 = pos3 - e.clientX;
	  pos2 = pos4 - e.clientY;
	  pos3 = e.clientX;
	  pos4 = e.clientY;
	  // set the element's new position:
	  elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
	  elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
	}
  
	function closeDragElement() {
	  // stop moving when mouse button is released:
	  document.onmouseup = null;
	  document.onmousemove = null;
	}
}
dragElement(videoContainer)