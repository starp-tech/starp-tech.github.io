// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-analytics.js";
import { 
	getAuth, 
	isSignInWithEmailLink, 
	sendSignInLinkToEmail,
	signInWithEmailLink 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAdmg-M42WaSQacbWa_-45mnhLPl5agzBE",
  authDomain: "starpy.me",
  projectId: "starpy",
  storageBucket: "starpy.appspot.com",
  messagingSenderId: "1012103782424",
  appId: "1:1012103782424:web:119d7746a26fbbe688636d",
  measurementId: "G-TGXM40S8J8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app)

const actionCodeSettings = {
  url: 'https://www.starpy.me/?userId=1234',
  // This must be true.
  handleCodeInApp: true
};
let linkSent = false;

const starpyLoginButton = document.getElementById("starpyLoginButton")
const signInWithEmail = async () => {
	
	if(linkSent)
		return

	const emailInput = document.getElementById("emailInput")
	console.info('==== try email ====')

  let email = emailInput.value
  
  console.info(email)

  if (!email) {
    email = window.prompt('Please provide your email for confirmation');
  }

	try {
  	await sendSignInLinkToEmail(auth, email, actionCodeSettings)
  	console.info('==== after succesfully send email =====')
    window.localStorage.setItem('emailForSignIn', email);
	} catch(err) {
		console.error(err)
		a.innerHTML = err.message.toLowerCase().replace("firebase", "starpy")
		setTimeout(()=>{
			linkSent = false
	    a.innerHTML = "Send Magic Link"
		}, 3000)
		return 
	}
	a.innerHTML = "Check Your Email"
}
const loginButtonClick = (e) => {
  let email = localStorage.getItem('emailForSignIn') || "";
	isLoginFormEnabled = true;
  leaveWarning.innerHTML = 
  	'<input type="email" id="emailInput" placeholder="enter your email" value="'+email+'">'
  a.innerHTML = "Send Magic Link"
	document.getElementById("emailInput").focus()
	a.href = "#"
	a.onclick = (e) => {
		signInWithEmail()
		if(e) {
			return e.preventDefault()
		}
	}
}
const isAppLogin = window.location.search.search("appLogin") > -1
const apiDomain = "https://www.starpy.me"
const checkAuthOnMount = async () => {
	try {
		const currentUser = JSON.parse(localStorage.getItem("currentUser"))
		// console.info('currentUser', currentUser)
  	if(currentUser) {
  		const authToken = localStorage.getItem("authToken")
  		const userData = await (await fetch(apiDomain+"/api/v1/backend/?authToken="+authToken)).json()
  		// console.info("userData", userData)
  		
  		if(userData.error)
  			throw userData.error

  		if(a) {
    		// a.href = apiDomain+"/webapp/"
    		// a.innerHTML = "TO WEBAPP"
    		// a.target = "_blank"
    		// delete a.download
    		starpyLoginButton.href = apiDomain+"/webapp/"
    		starpyLoginButton.innerHTML = "TO WEBAPP"
    		starpyLoginButton.target = "_blank"
		    starpyLoginButton.removeEventListener("click", loginButtonClick)
  		}

		  if(isAppLogin) {
		  	const loginData = await (
		  		await fetch(
		  			apiDomain+"/api/v1/backend/appLogin"
		  		)
		  	).json()
				let sUrl = "starpy://login/?loginData="
					+encodeURIComponent(
						JSON.stringify(loginData)
					)
		    a.className = ""
		    a.innerHTML = "Login into app"
		    a.href = sUrl
		    a.click()
		  }

  		return;
  	}
	} catch (err) {
		// console.error('auth error for currentUser', err)
	}

  if (isSignInWithEmailLink(auth, window.location.href)) {
    let email = window.localStorage.getItem('emailForSignIn');
    if (!email) {
      email = window.prompt('Please provide your email for confirmation');
    }
    const result = await signInWithEmailLink(auth, email, window.location.href)
    const currentUser = auth.currentUser
    const authToken = await auth.currentUser.getIdToken(true)
    localStorage.setItem('authData', JSON.stringify(result))
    localStorage.setItem('currentUser', JSON.stringify(currentUser))
    localStorage.setItem('authToken', authToken)
		
		const userData = await (await fetch(apiDomain+"/api/v1/backend/?authToken="+authToken)).json()
		
		// console.info("userData", userData)
		
		if(userData.error)
			throw userData.error

		if(!isAppLogin)
	    window.location = apiDomain+"/webapp"

	  if(isAppLogin) {
	  	const loginData = await (
	  		await fetch(
	  			apiDomain+"/api/v1/backend/appLogin"
	  		)
	  	).json()
			let sUrl = "starpy://login/?loginData="+
				encodeURIComponent(JSON.stringify())
	    a.className = ""
	    a.innerHTML = "Login into app"
	    a.href = sUrl
	    a.click()
	  }
	  return;
    // console.info('===== succesfully loggedin with email link ====', result)
  }
  if(isAppLogin)
  	loginButtonClick()
}
checkAuthOnMount()

// const 
let isLoginFormEnabled = false
starpyLoginButton.addEventListener("click", loginButtonClick)