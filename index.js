const http = require("http");
const app = require("express")();

app.get("/", (req,res) => res.sendFile(__dirname + "/index.html"));
app.listen(8081, () => console.log("listening on http port 8081"));

const WebSocketServer = require("websocket").server;
let connection = null;

const clients = {};
const games = {};

const httpserver = http.createServer((req,res) => {
    console.log('received a request')
})

const websocket = new WebSocketServer({
    "httpServer": httpserver
})

websocket.on("request", request => {
    connection = request.accept(null, request.origin);
    connection.on("open", () => console.log("opened!!"));
    connection.on("close", () => console.log("CLOSED!!"));
    connection.on("message", message => {
        const result = JSON.parse(message.utf8Data);
        console.log(result);

        //user wants to create a new game
        if(result.method === "create") {
            const clientId = result.clientId;
            const gameId = uuidv4();
            games[gameId] = {
                "id" : gameId,
                "balls" : 20,
                "clients" : []
            }
            const payload = {
                "method" : "create",
                "game" : games[gameId]
            }

            const con = clients[clientId].connection;
            con.send(JSON.stringify(payload));
        }

        //user wants to join game
        if(result.method === 'join') {
            const clientId = result.clientId;
            const gameId = result.gameId;
            const game = games[gameId];
            if(game.clients.length >= 3) return;
            const color = {'0':'red', '1':'green', '2':'blue'}[game.clients.length];
            const payload = {"method":"join","game":game};
            game.clients.push({clientId,color});
            if(game.clients.length === 3) updateGameState();
            game.clients.forEach(c=>{clients[c.clientId].connection.send(JSON.stringify(payload))});
        }
        //user plays the game 
        if(result.method === "play") {
            const client = result.clientId;
            const gameId = result.gameId;
            const ballId = result.ballId;
            const color = result.color;
            let state = games[gameId].state;
            if(!state) state = {};
            state[ballId] = color;
            games[gameId].state = state;

            const game = games[gameId];
            const payload = {"method":"play", "game":game};
        }
    });

    //generate a new client id
    const clientId = uuidv4();
    //create a hashmap
    clients[clientId] = {
        "connection" : connection
    }

    const payload = {
        "method" : "connect",
        "clientId" : clientId
    }
    //send back the client connect
    connection.send(JSON.stringify(payload));
})

httpserver.listen(8080, () => {
    console.log('server listening at 8080')
});

function updateGameState() {
    for(const g of Object.keys(games)) {
        const game = games[g];
        const payload = {method: "update", "game":game};
        games[g].clients.forEach(c=> {
            clients[c.clientId].connection.send(JSON.stringify(payload))
        })
    }
    setTimeout(updateGameState, 500);
}

function uuidv4() { // Public Domain/MIT
    var d = new Date().getTime();//Timestamp
    var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16;//random number between 0 and 16
        if(d > 0){//Use timestamp until depleted
            r = (d + r)%16 | 0;
            d = Math.floor(d/16);
        } else {//Use microseconds since page-load if supported
            r = (d2 + r)%16 | 0;
            d2 = Math.floor(d2/16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}
