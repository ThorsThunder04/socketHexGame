/* TODO (ema)
- figure out what to do with the coin when player leaves mid party
    - end game, popup saying player left
- on joinFail - show user why they couldnt join
- reset button - either after game end or both players agree
*/

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
let msgParity = 0; // just for differentiating messages
let hasWinner = false;
let coin = 0;
const wh = 6;
const colors = ["teal", "rgb(189 8 189)"];
let history = [];
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
 * @returns {Boolean} if the root makes a connections between two opposite of the grid (vertical or horizontal, depending on player)
*/
function dfs(arr, dims, root, player) {
	let toParse = [];
	let seen = [];
	let relativeTPos = [
		[-1,0], [-1,1],
		[0,-1], [0,1],
		[1,-1], [1,0],
	];

	toParse.push(root);
	seen.push(pos2n(root[1], root[0], dims));

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
					toParse.push([y,x]);
				}
			}
		}
	}
    let side1, side2;
    // * player will always be either 0 or 1
    if (player == 0) { // win condition for player 0 (top and bottom)
        side1 = seen.some((e) => {return Math.floor(e/dims) == 0;});
        side2 = seen.some((e) => {return Math.floor(e/dims) == dims-1;});
    } else if (player == 1) { // win condition for player 1 (left and right)
        side1 = seen.some((e) => {return e%dims == 0;});
        side2 = seen.some((e) => {return e%dims == dims-1;});
    }
    return (side1 && side2);
}

function leaving(socketID) {
    let index = socketList.indexOf(socketID);
    io.emit("newMessage", joinedUsers[index] + " left the party :(");
    joinedUsers.splice(index, 1);
    socketList.splice(index, 1);
    io.emit("currentPlayers", joinedUsers);
}

io.on("connection", (socket) => {
    
    socket.emit("currentPlayers", joinedUsers);
    socket.emit("createTable", {size: wh, colors: colors});
    spectatorStates[socket.id] = history.length - 1;

    // loads the table for them if they are spectating and there is already a game
    if (coin > 0) { // only does it if there is already a game in session
        socket.emit("loadGameTable", 
            {"table":gameTable, "colors":colors});
    
    };

    socket.on("newPlayer", data => {
        if (joinedUsers.length + 1 > nbJoueurs) {
            socket.emit("joinFailed", "Room Full");
        } else if (joinedUsers.includes(data)) {
            socket.emit("joinFailed", "Player with same name already in party");
        } else {
            delete spectatorStates[socket.id];
            socketList.push(socket.id);
            joinedUsers.push(data);
            console.log(data + " JOINED!");

            socket.emit("joinSuccess");
            io.emit("currentPlayers", joinedUsers);
            io.emit("newMessage", data + " joined the party!");
        }
    });

    socket.on("playerLeave", () => {
        leaving(socket.id);
        spectatorStates[socket.id] = history.length - 1;
    });

    socket.on("disconnect", () => {
        if (!socketList.includes(socket.id)) {
            delete spectatorStates[socket.id];;
            return;
        }
        leaving(socket.id);
    });

    socket.on("sentMessage", data => {
        let formattedMessage = joinedUsers[socketList.indexOf(socket.id)] + ": " + data;
        formattedMessage = ((msgParity%2) ? "%%%" : "###") + " " + formattedMessage; // kinda useless
        msgParity++;
        io.emit("newMessage", formattedMessage);
    });


    socket.on("selectionHexagon", async function(data) {
        let tile = data;

        if (!hasWinner && socketList.includes(socket.id)
        && socketList.indexOf(socket.id) === (coin % 2)) {
            let yT = Math.floor(tile/wh);
            let xT = tile%wh;
            if (gameTable[yT][xT] == -1) {
                //console.log(tile);
                history.push([tile, colors[coin%2]]);
                io.except("timeOut").emit("justPlayed", {"tile":tile, "coin":coin});
                
                let timeOutClients = await io.in("timeOut").fetchSockets();

                for (let sock of Object.keys(spectatorStates)) {
                    if (!timeOutClients.some(s => s.id == sock))
                        spectatorStates[sock]++;
                }
                
                gameTable[yT][xT] = coin%2;
                
                // check if there is a winner using the depth first search algorithm
                if (dfs(gameTable, wh, [yT, xT], coin%2)) {
                    hasWinner = true;
                } else {
                    coin++;
                }
            }                 
        }
        if (hasWinner) {
            let w = coin%2;
            io.emit("winner", {
                "winner": joinedUsers[w],
                "color": colors[w]}); 
        }
    });

//data: 0 (beginning) | 1 (step back) | 2 (step forward) | 3 (live)
    socket.on("changeView", data => {
        let newIndex;
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
                newIndex = spectatorStates[socket.id];
                
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
        hasWinner = false;
        coin = 0;
        for (let sock of Object.keys(spectatorStates)) {
            spectatorStates[sock] = -1;
        }
        gameTable = newGameTable(wh);

        // resets everyone's tables to be empty according to the server side gameTable
        io.emit("loadGameTable", {
            "table":gameTable,
            "colors":colors});

    })
});
