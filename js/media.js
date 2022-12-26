let isPlaying = false
const playMediaLink = async (mediaLink, currentPosition) => {
	if(isPlaying)
		return

	isPlaying = true;
	
	try {
		
		if(mediaLink.search("magnet") > -1) {
			await playMesh(mediaLink, currentPosition)
		} else {
			showVideoPlayer(mediaLink, currentPosition)
		}

	} catch(err) {
		isPlaying = false
		console.error("playMediaLink err", err)
	}
}
let registeredWorker = false;
let mediaWorker;
let mediaClient;
const playMesh = async (mediaLink, currentPosition) => 
	new Promise((resolve,reject)=> {
		console.info("playMediaLink", mediaLink)
    showVideoPlayer("", currentPosition)
    if(mediaWorker && mediaClient) {
    	download()
    	return;
    }
		mediaClient = new WebTorrent({
			// downloadLimit:1000
		})
    mediaClient.on('error', function (err) {
      console.error('playMediaLink err: ' + err.message)
      reject(err)
    })
		const download = () =>  {
			console.info('playMediaLink on download')
			mediaClient.add(mediaLink, (media) => {
				try {
					console.info('playMediaLink on media', media)
				  const file = media.files.find(function (file) {
	          return file.name.endsWith(".mp4") 
	          || file.name.endsWith(".webm") 
	          || file.name.endsWith(".mov");
	        });
				  console.info('playMediaLink on file', file)
	        file.getStreamURL((err, url) => {
	          console.log("playMediaLink ready", url);
	          showVideoPlayer(url, currentPosition)
	          resolve(url)
	        });
				} catch(err) {
					console.error("playMediaLink err", err)
				}
			})
		}
		navigator.serviceWorker.register("sw.min.js")
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
	})

const videoContainer = document.getElementById("videoContainer")
const videoPlayer = document.getElementById("videoPlayer")
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

const hideVideoPlayer = (e) => {
	if(videoContainer.className === "hidden")
		return
	document.body.className = ""
	if(e)
		e.preventDefault()
	videoPlayer.src = ""
	videoContainer.className = "hidden"
	isPlaying = false;
}
