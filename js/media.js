let isPlaying = false
let registeredWorker = false;
let mediaWorker;
let mediaClient;
let prevMeshMedia = {}
let meshLinksAdded = {}
const fileHackingSelectButton = document.getElementById("fileHackingSelectButton")
const hackingFileInput = document.getElementById("hackingFileInput")
window.currentMediaLink = "";
const playMediaLink = async (mediaLink, currentPosition) => {
	if(isPlaying)
		return
	currentMediaLink = mediaLink;
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
let refreshMediaTimeout;
const refreshMediaTimeoutInterval = 5000;
const refreshMedia = (mediaLink) => {
	let tm = mediaClient.torrents.find(t=>t.magnetURI === mediaLink)
	if(tm) {
		clearTimeout(refreshMediaTimeout)
		console.info("stale peer media", tm)
		tm.resume()
		refreshMediaTimeout = 
			setTimeout(refreshMedia, refreshMediaTimeoutInterval)
	}
}

const createMediaClient = (download) => {
	mediaClient = new WebTorrent({
		// downloadLimit:1000
	})
  mediaClient.on('error', function (err) {
    console.error('playMediaLink err: ' + err.message)
    // reject(err)
  })
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
}
const playMesh = async (mediaLink, currentPosition, cb) => 
	new Promise(async (resolve,reject)=> {

    if(!cb)
    	showVideoPlayer("", 0)

		if(mediaClient) {
			await Promise.all(
				Object.keys(prevMeshMedia)
				.map(m=>prevMeshMedia[m].pause())
			)
			// if(!prevMeshMedia[mediaLink])
			// 	prevMeshMedia[mediaLink] = mediaClient.torrents.find((mt)=>mt.magnetURI===mediaLink)
		}

		const play = (media) => {
			
			if(!prevMeshMedia[mediaLink])
				prevMeshMedia[mediaLink] = media

	    if(media.files.length) {
				console.info('playMediaLink on media', media)
			  let file = media.files.find(function (file) {
	        return file.name.endsWith(".mp4") 
	        || file.name.endsWith(".webm") 
	        || file.name.endsWith(".mov");
	      });
	      
	      if(!file && media.files.length) {
	      	file = media.files[0]
	      }

			  console.info('playMediaLink on file', file)
	      file.getStreamURL((err, url) => {
	        console.log("playMediaLink ready", url);
	        if(cb) {
	        	cb(url)
	        	resolve(url)
	        	return;
	        }
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
		const download = () =>  {
			console.info('playMediaLink on download')
			if(meshLinksAdded[mediaLink]) {
				refreshMedia()
				return;
			}
			meshLinksAdded[mediaLink] = true
			refreshMediaTimeout = 
				setTimeout(refreshMedia, refreshMediaTimeoutInterval)
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

const parseMediaFile = async (nfile, cb) => {
	console.info('nfile', nfile)
	try {
		if(!nfile) {
			const file = query.split("?file=")[1]
			const fspl = file.split("/")
			const filename = fspl[fspl.length-1]
			createMediaClient(()=>{
				console.info('worker did set up')
			})
			nfile = new File([
				await (await fetch(file)).blob()
			], filename)
		}

		mediaClient.seed(nfile
		, (media)=>{
			console.info("media", media)
			const { magnetURI } = media

			if(window.ReactNativeWebView 
				&& window.ReactNativeWebView.postMessage) {
				window
				.ReactNativeWebView
				.postMessage(magnetURI)
			}
			refreshMedia(magnetURI)
			if(cb) cb(media)
		})

	} catch(err) {
		console.error('parseMediaFile error', err)
			if(window.ReactNativeWebView 
				&& window.ReactNativeWebView.postMessage) {
				window
				.ReactNativeWebView
				.postMessage(
					JSON.stringify(
						{error:err.message}
					)
				)
			}

	}
}
let clipboardMediaUrl = null;
const parseDownloadFile = async () => {
	console.info('parseDownloadFile')

	try {
		a.innerHTML = "Loading File"
		a.href = "#fileHackingSelectButton"
		await createMediaClient()
		const mediaLink = hashStart.split("#download=")[1]
		const meshUrl = await playMesh(mediaLink, 0, (mUrl)=>{
			a.innerHTML = "Download File"
			a.href = mUrl
		})

	} catch(err) {
		console.error('parseDownloadFile', err)
	}
}
const handleFileClickSelect = async (e) => {
	
	if(clipboardMediaUrl) {
		navigator.clipboard.writeText(clipboardMediaUrl)
		return e.preventDefault();
	}

	try {
		await createMediaClient()
	} catch(err) {
		console.error("handleFileClickSelect client err", err)
	}
	hackingFileInput.click(); 
	return e.preventDefault();
}

hackingFileInput.addEventListener("change", (e)=>{
	console.info('new file', hackingFileInput.files)
	if(hackingFileInput.files.length) {
		parseMediaFile(hackingFileInput.files[0], (media)=>{
			console.info("new media", media)
			clipboardMediaUrl = "https://starpy.me/#download="+media.magnetURI
			navigator.clipboard.writeText(clipboardMediaUrl)
			fileHackingSelectButton.innerHTML = "Copy Link"
		})
	}
})

fileHackingSelectButton.addEventListener("click", handleFileClickSelect)

if(query && query.indexOf("?file=") > -1) {
	parseMediaFile()
}

if(hashStart && hashStart.indexOf("#download=") > -1) {
	parseDownloadFile()
}