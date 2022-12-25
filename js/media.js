const processIncomingFileLink = () => {
	try {
		console.info("processIncomingFileLink 23")
		const client = new WebTorrent({
			// downloadLimit:1000
		})
    client.on('error', function (err) {
      console.error('ERROR: ' + err.message)
    })
		const fileB = query.split("fileId=")[1].split("&")[0]
		const fileId = atob(fileB)
		const download = () => 
			client.add(fileId, (media) => {
				try {
					console.info('media', media)
					window.starpyMedia = media
				  const file = media.files.find(function (file) {
	          return file.name.endsWith(".mp4");
	        });
				  window.starpyFile = file
				  console.info('file', file)
			    // Render to a <video> element by providing an ID. Alternatively, one can also provide a DOM element.
	        file.getStreamURL((err, url) => {
	          console.log("Ready to play!", url);
	        });
				} catch(err) {
					console.error("processIncomingFileLink err", err)
				}
			})
		navigator.serviceWorker.register("sw.min.js").then(reg => {
		  const worker = reg.active || reg.waiting || reg.installing
		  function checkState (worker) {
		    return worker.state === 'activated' && client.loadWorker(worker, download)
		  }
		  if (!checkState(worker)) {
		    worker.addEventListener('statechange', ({ target }) => checkState(target))
		  }
		})
	} catch(err) {
		console.error("processIncomingFileLink err", err)
	}
}
const playMediaLink = (mediaLink) => {
	try {
		console.info("processIncomingFileLink 23")
		const client = new WebTorrent({
			// downloadLimit:1000
		})
    client.on('error', function (err) {
      console.error('ERROR: ' + err.message)
    })
		const download = () => 
			client.add(mediaLink, (media) => {
				try {
					console.info('media', media)
				  const file = media.files.find(function (file) {
	          return file.name.endsWith(".mp4");
	        });
				  console.info('file', file)
			    // Render to a <video> element by providing an ID. Alternatively, one can also provide a DOM element.
	        file.getStreamURL((err, url) => {
	          console.log("Ready to play!", url);
	        });
				} catch(err) {
					console.error("processIncomingFileLink err", err)
				}
			})
		navigator.serviceWorker.register("sw.min.js").then(reg => {
		  const worker = reg.active || reg.waiting || reg.installing
		  function checkState (worker) {
		    return worker.state === 'activated' && client.loadWorker(worker, download)
		  }
		  if (!checkState(worker)) {
		    worker.addEventListener('statechange', ({ target }) => checkState(target))
		  }
		})
	} catch(err) {
		console.error("processIncomingFileLink err", err)
	}
}


if(query 
	&& query.search("fileId") > -1 
) {
	processIncomingFileLink()
}