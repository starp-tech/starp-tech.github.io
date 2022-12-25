
function join(partyId) {
  // If we are running via wrangler dev, use ws:
  const socketUrl = "wss://www.starpy.me/api/v1/socket"
  const username = "anon"
  const userId = "anon"
  
  const ws = new WebSocket(socketUrl);

  ws.addEventListener("open", event => {
    currentWebSocket = ws;
    console.info('ws opened')
    // Send user info message.
    ws.send(JSON.stringify({name: username, partyId, userId}));
  });

  ws.addEventListener("message", event => {
    let data = JSON.parse(event.data);
    console.info('new party message', data)
  });

  ws.addEventListener("close", event => {
    console.log("WebSocket closed, reconnecting:", event.code, event.reason);
    join(partyId)
  });

  ws.addEventListener("error", event => {
    console.log("WebSocket error, reconnecting:", event);
    // rejoin();
  });
}

join()