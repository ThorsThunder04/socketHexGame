const express = require('express');
const app = express();
const http = require('http');
const { relative } = require('path');
const server = http.createServer(app);
const io = new require("socket.io")(server);
server.listen(8888, () => {console.log('Le serveur écoute sur le port 8888');});

app.get('/', (request, response) => {
    response.sendFile('client_socket.io.html', {root: __dirname});
});

app.get("/file/:file", (req,res) => {
    res.sendFile(req.params.file, {root: __dirname});
});

let joinedUsers = [];
let socketList = [];
//form of spectatorStates: {socket.id: moveBeingViewed};
let spectatorStates = {};
let nbJoueurs = 2;
let numChats = 0;
let hasWinner = false;
let coin = 0;
const wh = 6;
const colors = ["teal", "rgb(189 8 189)"];
let history = []; // of form [[y*wh + x, color],...]
let gameTable = [];
for (let i = 0; i < wh; i++) {
    let a = [];
    for (let j = 0; j < wh; j++) {
        a.push(-1);
    }
    gameTable.push(a);
}

/**
 * Creates and returns a new array for the game
 * 
 * @param {Number} size: Width*Height (both equal) size of the table
 * @returns {Number[][]} 2D array of the table containing just -1
 */
function newGameTable(size) {
    let newTable = [];
    for (let i = 0; i < size; i++) {
        let arr = new Array(size);
        arr.fill(-1);
        newTable.push(arr);
    }
    return newTable;
}

// converts x and y coordinates into y*d + x (with d the length of a line)
function pos2n(x,y,d) {return y*d + x;}

/**
 * Using a list of relative positions and the size of the 2D array, we calculate what positions are valid.
 * So if a relative positions applied to pos would give an index error according to `dims`,
 * we do not return that relative position.
 * We only return relative positions that when applied to `pos`, don't cause an index error in an `arr[dims][dims]` array.
 * 
 * @param {Number[]} pos: current (y,x) index
 * @param {Number[][]} relativePositions: contains relative position values for `pos`
 * @param {Number} dims: 1:1 dimensions for the array `pos` is in 
 * @returns {Number[][]} filtered to only include valid relative indexes
 */
function filterIndexErr(pos, relativePositions, dims) {
	let [ y, x ] = pos;
	let newArr = [];
	for (let rPos of relativePositions) {
		let [ ny, nx ] = rPos;

        // check if the coordinates with the applied offsets are still within bounds
		if (((y+ny) >= 0) && ((y+ny) < dims) &&
            ((x+nx) >= 0) && ((x+nx) < dims)) 
        {
			newArr.push(rPos);
		}
	}
	return newArr;
}

/**
 * Depth first search algorithm for detecting a winner in a grid game.
 * For each tile a player places, we will run this algorithm with the tile they
 * placed as the root. Then traverse all tiles of their color to see if
 * they have linked both edges.
 *
 * @param {Number[][]} arr: contains the state of the current playing field. value -1: nothing played here, otherwise playernumber
 * @param {Number} dims: since arr is of size arr[dims][dims], we only need 1 value for it 
 * @param {Number[]} root: (y,x) position of the tile placed by player in arr
 * @param {Number} player: player number of who just played on the root tile
 *
 * @returns {Array<boolean,Array<String>>} return boolean of whether someone has connected two sides of the grid, and also return an array of tile IDs that connect those two sides
 */
function dfs(arr, dims, root, player) {
	let toParse = [];
	let seen = [];
    let parents = {}; // for each node, we have the form {node: parentNode} (The root's parent is it's self)
	let relativeTPos = [
		[-1,0], [-1,1],
		[0,-1], [0,1],
		[1,-1], [1,0],
	];

	toParse.push(root);
    let rootN = pos2n(root[1], root[0], dims);
	seen.push(rootN);
    parents[rootN] = rootN;

	while (toParse.length > 0) {
		let node = toParse.pop();
        // filter out relative indexes that would cause errors
		let relativeTPosBis = filterIndexErr(node, relativeTPos, dims);
		if (relativeTPosBis.length > 0) { // if adjacent nodes
			
			for (let [i, j] of relativeTPosBis) {
                // apply relative indexes to current position
				let x = node[1] + j;
				let y = node[0] + i;
				let n = pos2n(x,y,dims);

				if (arr[y][x] == player && !seen.includes(n)) {
					seen.push(n); // because we can't compare [x,y], but can compare numbers (y*dims + x)
                    parents[n] = pos2n(node[1], node[0], dims); // log it's parent
					toParse.push([y,x]);
				}
			}
		}
	}
    let side1, side2;
    let side1Tile, side2Tile;
    // * player will always be either 0 or 1
    if (player == 0) { // win condition for player 0 (top and bottom)
        side1 = seen.some((e) => {
            let res = Math.floor(e/dims) == 0; 
            if (res) side1Tile = e; // allows us to backtrack to the root (same thing for the next 3 seen.some(...) statements too)
            return res;});
        side2 = seen.some((e) => {
            let res = Math.floor(e/dims) == dims-1;
            if (res) side2Tile = e;
            return res;});
    } else if (player == 1) { // win condition for player 1 (left and right)
        side1 = seen.some((e) => {
            let res = e%dims == 0;
            if (res) side1Tile = e;
            return res;});
        side2 = seen.some((e) => {
            let res = e%dims == dims-1;
            if (res) side2Tile = e;
            return res;});
    }
    // fill array with the tiles that make up the winning path
    let winningPath = ['h' + rootN];
    if (side1 && side2) { // collect all tiles leading from each side to the root (effecively making a path from one side to the other)
        let curr = side1Tile;
        while (curr!=rootN) {
            winningPath.push('h' + curr);
            curr = parents[curr];
        }
        curr = side2Tile;
        while (curr!=rootN) {
            winningPath.push('h' + curr);
            curr = parents[curr];
        }
    }
    return [(side1 && side2), winningPath];
}

/**
 * Sends a message to all of the client's chat boxes
 * 
 * @param {String} content: The content of the message being sent 
 * @param {String} type: the type of message being sent. Takes values: sysMsg|userMsg|joinMsg|leaveMsg (represents CSS class names)
 * @param {String} user: username of person sending message. Only ever used if `type` is "userMsg" 
 */
function sendChat(content, type, user = undefined) { 
    //? Would there be any reason for us to maybe add an option to send a message to an individual client?
    if (!(type=="userMsg" && content.trim()=="")) {
        io.emit("newMessage", [content, type, numChats, user]);
        numChats++;
    }
}

function resetGame() {
    hasWinner = false;
    coin = 0;
    // set all spectators to the beginning of the new game
    for (let sock of Object.keys(spectatorStates)) {
        spectatorStates[sock] = -1;
    }
    gameTable = newGameTable(wh);
    history = [];

    // resets everyone's tables to be empty according to the server side gameTable
    io.emit("loadGameTable", {
        "table":gameTable,
        "colors":colors
    });

}

function leaving(socketID) {
    let index = socketList.indexOf(socketID);
    sendChat(joinedUsers[index] + " left the party :(", "leave-msg");
    console.log(joinedUsers[index] + " LEFT!");
    joinedUsers.splice(index, 1);
    socketList.splice(index, 1);
    io.emit("currentPlayers", joinedUsers);

    // if the player who left was at index 0, we send a message to the remaining player, who's session
    // gets reset as if they were player 0 in the previous session (all this just fixes color issues)
    if (index == 0) {
        io.to(socketList[0]).emit("joinSuccess", [joinedUsers[0], joinedUsers.length-1]);
    }
}

io.on("connection", (socket) => {
    
    socket.emit("createTable", {size: wh, colors: colors});
    socket.emit("currentPlayers", joinedUsers);
    spectatorStates[socket.id] = history.length - 1;

    // loads the table for them if they are spectating and there is already a game
    if (coin > 0) { // only does it if there is already a game in session
        socket.emit("loadGameTable", 
            {"table":gameTable, "colors":colors});
    
    };

    socket.on("newPlayer",  async data => {
        data = data.trim(); // removes leading and trailing whitespace

        if (joinedUsers.length + 1 > nbJoueurs) {
            socket.emit("joinFailed", "Room Full");
        } else if (joinedUsers.includes(data)) {
            socket.emit("joinFailed", "Player with same name already in party");
        } else if (data == "") {
            socket.emit("joinFailed", "Username can't be composed of just whitespace");
        } else if (data.length > 24) {
            socket.emit("joinFailed", "Username can't be longer than 24 characters")
        } else {
            delete spectatorStates[socket.id];
            socketList.push(socket.id);
            joinedUsers.push(data);
            console.log(data + " JOINED!");

            io.emit("currentPlayers", joinedUsers);
            // auxiliary function to avoid an error caused by asynchronicity
            await socket.timeout(1000).emitWithAck("waiting");
            socket.emit("joinSuccess", [data, joinedUsers.length-1]); // username
            sendChat(data + " joined the party!", "join-msg");

            // we want to reset the previous game once a new player joins to play
            if (coin > 0) {
                resetGame();
            }
        }
    });

    // removes player from the game and puts them in the spectator list 
    socket.on("playerLeave", () => {
        leaving(socket.id);
        spectatorStates[socket.id] = history.length - 1;
    });

    socket.on("disconnect", () => {
        // remove user from the spectator list if they werent playing
        if (!socketList.includes(socket.id)) {
            delete spectatorStates[socket.id];;
            return;
        }
        // if the disconnecting user was playing, makes them leave the game  
        leaving(socket.id);
    });

    socket.on("sentMessage", msgContent => {
        if (socketList.includes(socket.id)) {
            let username = joinedUsers[socketList.indexOf(socket.id)];
            sendChat(msgContent, "user-msg", username);
        }
    });


    socket.on("selectionHexagon", async function(data) {
        let tile = data;
        let winningPath = [];

        if (!hasWinner 
            && socketList.includes(socket.id)
            && socketList.indexOf(socket.id) === (coin % 2)
            && socketList.length == 2) {

            let yT = Math.floor(tile/wh);
            let xT = tile%wh;
            if (gameTable[yT][xT] == -1) {
                history.push([tile, colors[coin%2]]);
                io.except("timeOut").emit("justPlayed", {"tile":tile, "coin":coin});
                
                let timeOutClients = await io.in("timeOut").fetchSockets();

                for (let sock of Object.keys(spectatorStates)) {
                    if (!timeOutClients.some(s => s.id == sock))
                        spectatorStates[sock]++;
                }
                
                gameTable[yT][xT] = coin%2;
                
                // check if there is a winner using the depth first search algorithm
                let [winnerRes, pathRes] = dfs(gameTable, wh, [yT, xT], coin%2); 
                if (winnerRes) {
                    hasWinner = true;
                    winningPath = pathRes;
                } else {
                    coin++;
                }
            }                 
        }

        if (hasWinner) {
            let w = coin%2;
            io.emit("winner", {
                "winner": joinedUsers[w],
                "playerNb": w,
                "path": winningPath});

            sendChat(joinedUsers[w] + " IS THE WINNER!!!", "sys-msg");
        }
    });

//data: 0 (beginning) | 1 (step back) | 2 (step forward) | 3 (live)
    socket.on("changeView", data => {
        let lastMove = history.length - 1;
        switch(data) {
            case 0:
                spectatorStates[socket.id] = -1;
                freshTable = newGameTable(wh);
                socket.join("timeOut");

                socket.emit("loadGameTable", {
                    "table" : freshTable, 
                    "colors": colors});
                break;
            case 1:
                if (spectatorStates[socket.id] == -1) return;
                
                socket.emit("newView", {
                    "goBack": true, 
                    "change": history[spectatorStates[socket.id]]
                    });

                socket.join("timeOut");
                spectatorStates[socket.id]--;
                break;
            case 2:
                if (spectatorStates[socket.id] == lastMove) return;
                
                spectatorStates[socket.id]++;
                let newIndex = spectatorStates[socket.id];
                
                if (newIndex == lastMove) // player up to date
                    socket.leave("timeOut");    
                
                socket.emit("newView", {
                    "goBack": false, 
                    "change": history[newIndex]
                    });
                break;
            case 3:
                spectatorStates[socket.id] = lastMove;
                socket.leave("timeOut");
                socket.emit("loadGameTable", {
                    "table": gameTable, 
                    "colors": colors});
        }
    });

    socket.on("resetGame", () => {
        // sets everything to defaults

        //TODO* in addition to reset at the end, maybe make it so that both players can vote wether to reset or not
        // treats cases: the game is finished; someone left, and so reset for when someone else joins; a spectator is trying to reset
        if (joinedUsers.length == 2 && !hasWinner || Object.keys(spectatorStates).includes(socket.id)) return;
        resetGame();

    });
});
