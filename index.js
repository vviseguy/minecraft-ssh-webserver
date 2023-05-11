//    mc envelope server
//     +-------------+                                /{web client}
//     | [MC server] |}========{[this, on AWS server]k--{web client}
//     +-------------+                                \{web client}
//


// node.js express
const express = require('express');
const { WebSocketServer } = require('ws');
const WebSocket = require('ws');
const app = express();

let mcHostSocket = null;

let tryConnectionTimeout = null;

let numWebClients = 0;

// The service port. In production the front-end code is statically hosted by the service on the same port.
const port = process.argv.length > 2 ? process.argv[2] : 4100;

let wss = null;


const names = {
  "Mr. Incredible":0,
  "Elastigirl":0, 
  "Dash":0,
  "Violet":0,
  "Jack-jack":0,
  "Frozone":0,
  "Bomb Voyage":0,
  "THe UnDErMINeR":0,
  "Syndrome":0,
  "Edna Mode": 0,
  "Mirage": 0,
  "Kari the Babysitter": 0,
  "Mr. Hugh": 0,
  "Mr. Dicker":0,
  "Tony Rydinger":0,
  "Mr. Bernie Kropp":0,
  "Honey":0,
  "Gazerbeam":0,
  "Fironic":0,
  "Stratogale":0,
  "Dynaguy":0
};

// JSON body parsing using built-in middleware
app.use(express.json());

// Serve up the front-end static content hosting
app.use(express.static('public'));


app.get("/status",(req, res) => {
  return res.send({status:mcHostSocket !== null});
});

app.get("/define",(req, res) => {
  return res.send({name: assignName()});
});

// Return the application's default page if the path is unknown
app.use((_req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

const httpService = app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
wss = new WebSocketServer({ noServer: true });

// Handle the protocol upgrade from HTTP to WebSocket
httpService.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, function done(ws) {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws) => {

  numWebClients++;
  if (tryConnectionTimeout == null) tryConnection();
  console.log('WebSocket client connected');

  if (mcHostSocket == null){
    ws.send("Chat is disconnected from minecraft");
  } else {
    ws.send("Chat is online");
  }

  ws.on('message', (message) => {
    console.log(`Received message: ${message}`);
    
    if (mcHostSocket !== null){
      // Echo the message to the minecraft server websocket
      mcHostSocket.send(message);
    }
    // Echo to all web clients
    sendMessageToWebClients(message.toString());
  });

  ws.on('close', () => {
    numWebClients--;
    console.log('WebSocket client disconnected');
    if (numWebClients == 0) clearTimeout(tryConnectionTimeout);
  });
});



function sendMessageToWebClients(message){
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}


function assignName(){
  const name = Object.keys(names)[Math.random() * Object.keys(names).length << 0];
  names[name]++;
  if (names[name] > 1) return name + " " + names[name];
  return name;
}

function tryConnection(){
  
  if (mcHostSocket !== null) {

    console.log('Have connection to WebSocket');
    return;
  }
  console.log('Trying to connect to the Minecraft-end WebSocket');
  console.log(mcHostSocket);
  try{
    mcHostSocket = new WebSocket('ws://vviseguy.click:25566');
    mcHostSocket.on('error', (err) => {
      console.error('WebSocket error:', err);
    });
    mcHostSocket.addEventListener('open', (event) => {
      // setMCServerStatus(true); // FIX
      sendMessageToWebClients("Chat is online");
      console.log('Minecraft-end WebSocket connected');
      mcHostSocket.addEventListener('close', (event) => {
        sendMessageToWebClients("Chat disconnected from minecraft");
        tryConnection();
      });
    });
    mcHostSocket.addEventListener('close', (event) => {
      console.log('Minecraft-end WebSocket disconnected');
      mcHostSocket = null;
      tryConnectionTimeout = setTimeout(tryConnection, 2000);
    });
    
    // send server-side messages to the web browsers
    mcHostSocket.addEventListener('message', (event) => {
      sendMessageToWebClients(event.data.toString());
    });

  } catch {
    console.log('Socket connection unsucessful');
    mcHostSocket = null;
    if (numWebClients > 0) tryConnectionTimeout = setTimeout(tryConnection, 2000);
    else tryConnectionTimeout = null;
  }
}


tryConnection();