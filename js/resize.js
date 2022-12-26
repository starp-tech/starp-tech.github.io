let isResizeLocked = false
let resizeTimeout;
document.getElementById("platform").style = "background-image: url(img/fr.jpeg);background-position:"+window.innerWidth/2+"px;"
addEventListener("resize", (event) => {
	// console.info('resize')
	disableAnimation = true;
	isResizeLocked = true;
	document.getElementById("platform").style = "background-image: url(img/fr.jpeg);background-position:"+window.innerWidth/2+"px;"
	clearTimeout(resizeTimeout)
	resizeTimeout = null
	resizeTimeout = setTimeout(()=>{
		drawLandscape()
		isResizeLocked = false;
	}, 100)
})