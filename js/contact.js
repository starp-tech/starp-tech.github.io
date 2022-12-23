const query = window.location.search
const osXdownloadUrl = "https://www.starpy.me/appcast/StarpyApp.tar.xz"
const a = document.getElementById('joinButton');
a.className = ""
a.innerHTML = "Download For Mac OS X"
a.href = osXdownloadUrl
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