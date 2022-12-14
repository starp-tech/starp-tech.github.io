
const hashStart = window.location.hash

function isMacintosh() {
  return navigator.platform.indexOf('Mac') > -1
}

function isWindows() {
  return navigator.platform.indexOf('Win') > -1
}
function isiOS() {
  return [
    'iPad Simulator',
    'iPhone Simulator',
    'iPod Simulator',
    'iPad',
    'iPhone',
    'iPod'
  ].includes(navigator.platform)
  // iPad on iOS 13 detection
  || (navigator.userAgent.includes("Mac") && "ontouchend" in document)
}

const query = window.location.search
const osXdownloadUrl = "https://www.starpy.me/appcast/StarpyApp.tar.xz"
const a = document.getElementById('joinButton');
a.className = ""
if(isMacintosh()) {
	a.innerHTML = "Download MAC OSX App"
	a.href = osXdownloadUrl
}
const processInitScreen = () => {
  try {
		let sUrl = "starpy://"+window.location.search.replace("?", "")
		const token = window.location.search.split("join=")[1]
		let id = token
		if(token.search(".") > -1) {
			let json = JSON.parse(atob(token.split('.')[1]))
			id = json.name
			console.info(json)
			sUrl = "starpy://join="+token
		}
    a.className = ""
    a.innerHTML = "Join <span style='color:gray;'>"+id+"</span>"
    a.href = sUrl
    // a.click()
    return;
  } catch(err) {
		console.error("process link err", err)
	}
}
if(query && query.search("join") > -1) {
  processInitScreen()
} 