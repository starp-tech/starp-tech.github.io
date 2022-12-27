let isPlaying = false
let registeredWorker = false;
let mediaWorker;
let mediaClient;
let prevMeshMedia = {}
let meshLinksAdded = {}
window.currentMediaLink;
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
const playMesh = async (mediaLink, currentPosition) => 
	new Promise(async (resolve,reject)=> {

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

	    if(currentMediaLink === mediaLink && media.files.length) {
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
		const refreshMedia = () => {
			let tm = mediaClient.torrents.find(t=>t.magnetURI === mediaLink)
			if(tm) {
				console.info("stale peer media", tm)
				tm.resume()
			}
		}
		let refreshMediaTimeout;
		const refreshMediaTimeoutInterval = 1000;
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
				clearTimeout(refreshMediaTimeout)
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

const parseMediaFile = async () => {
	const file = query.split("?file=")[1]
	const fspl = file.split("/")
	const filename = fspl[fspl.length-1]
	createMediaClient(()=>{
		console.info('worker did set up')
	})
	try {
		window.getFiles = () => {}
		mediaClient.seed(file
		, (media)=>{
			console.info("media", media)
			if(window.ReactNativeWebView 
				&& window.ReactNativeWebView.postMessage) {
				window.ReactNativeWebView.postMessage(media.magnetURI)
			}
		})
	} catch(err) {
		console.error('parseMediaFile error', err)
			if(window.ReactNativeWebView 
				&& window.ReactNativeWebView.postMessage) {
				window.ReactNativeWebView.postMessage({error:err.message})
			}

	}
}

if(query && query.search("file") > -1) {
	parseMediaFile()
}