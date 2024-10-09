const express = require('express');
const app = express();
const http = require('http');
const { relative } = require('path');
const server = http.createServer(app);
const io = new require("socket.io")(server);
server.listen(8888, () => {console.log('Le serveur écoute sur le port 8888');});
// geko
app.get('/', (request, response) => {
    response.sendFile('client_socket.io.html', {root: __dirname});
});

app.get("file/:file", (req,res) => {
    res.sendFile(req.params.file, {root: __dirname});
});

let joinedUsers = [];
let nbJoueurs = 2;
let msgParity = 0; // just for differentiating messages
let whosPlaying = [-1,-1]; 
let hasWinner = false;
let coin = 0;
const wh = 3;
const colors = ["teal", "rgb(189 8 189)"];
let gameTable = [];
for (let i = 0; i < wh; i++) {
    let a = [];
    for (let j = 0; j < wh; j++) {
        a.push(-1);
    }
    gameTable.push(a);
}

function b2n(b) {return (b) ? 1 : 0;} // turns boolean into number because js is annoying like that
function pos2n(x,y,d) {return y*d + x;}

/**
 * Using a list of relative positions and the size of the 2D array, we calculate what positions are valid.
 * So if a relative positions applied to pos would give an index error according to `dims`,
 * we do not return that relative position.
 * We only return relative positions that when applied to `pos`, don't cause an index error in an `arr[dims][dims]` array.
 * 
 * @param pos: 1D int Array | current (y,x) index
 * @param relativePositions: 2D int array | contains relative position values for `pos`
 * @param dims: int | 1:1 dimentions for the array `pos` is in 
 * @returns 2D int array | filtered to only include valid relative indexes
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
 * @param arr: 2D int Array | contains the state of the current playing field. value -1: nothing played here, otherwise playernumber
 * @param dims: int | since arr is of size arr[dims][dims], we only need 1 value for it 
 * @param root: 1D int Array | (y,x) position of the tile placed by player in arr
 * @param player: int | player number of who just played on the root tile
 *
 * @returns boolean of if the root makes a connections between the two edges of hte grid
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
		if (relativeTPosBis.length > 0) {
			
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
    if (player == 0) { // win conditino for player 0 (top and bottom)
        side1 = seen.some((e) => {return Math.floor(e/dims) == 0;});
        side2 = seen.some((e) => {return Math.floor(e/dims) == dims-1;});
    } else if (player == 1) { // win condition for player 1 (left and right)
        side1 = seen.some((e) => {return e%dims == 0;});
        side2 = seen.some((e) => {return e%dims == dims-1;});
    }
    return (side1 && side2);
}


io.on('connection', (socket) => {
    socket.on('initialLoad', data => {
        console.log("Message reçu du client :", data);
        socket.emit("currentPlayers", joinedUsers);
        socket.emit("createTable", wh);

        // loads the table for them if they are spectating and there is already a game
        if (coin > 0) { // if someone has played already. Otherwise there's no use.
            socket.emit("loadGameTable", 
                {"table":gameTable, "colors":colors});
        }
    });

    socket.on("newPlayer", data => {
        if (joinedUsers.length + 1 > nbJoueurs) {
            socket.emit("joinFailed", "Room Full");
        } else if (joinedUsers.includes(data)) {
            socket.emit("joinFailed", "Player Already Joined");
        } else {
            joinedUsers.push(data);
            console.log(data + " JOINED!");
            socket.emit("joinSuccess", joinedUsers.length-1)
            io.emit("currentPlayers", joinedUsers);
            // ! this is for automatically making people join the grid game. Should be changed
            if (joinedUsers.length < 3) {whosPlaying[joinedUsers.length-1] = joinedUsers.length-1;}

        }
    });

    socket.on("playerLeave", playerNum => {
        console.log(joinedUsers[playerNum] + " LEFT!");
        joinedUsers.splice(playerNum, 1); 
        socket.broadcast.emit("playerLeave", playerNum); // if a player's number is > the one who left. They decrement their num
        io.emit("currentPlayers", joinedUsers);
    });

    socket.on("sentMessage", data => {
        // makes sure the player exists
        if (data["player"] < joinedUsers.length && data["player"] != -1) {
            let formattedMessage = " " + joinedUsers[data["player"]] + ": " + data["text"];
            formattedMessage = ((msgParity%2) ? "%%%" : "###") + formattedMessage; // kinda useless
            msgParity++;
            io.emit("newMessage", formattedMessage);
        }
    });


    socket.on("selectionHexagon", data => {
        let {UID, tile} = data;
        // if the UID is one that actually exists
        if (!hasWinner && UID >= 0 && UID < joinedUsers.length) {

            if (whosPlaying.includes(UID)) {
                console.log("Who's playing: " + whosPlaying[coin%2]);
                // if this is the UID of the player who's turn it is
                if (whosPlaying[coin%2] == UID) {
                    let yT = Math.floor(tile/wh);
                    let xT = tile%wh;
                    if (gameTable[yT][xT] == -1) {
                        console.log(tile + colors[coin%2]);
                        io.emit("justPlayed", {"tile":tile, "color":colors[coin%2]});
                        gameTable[yT][xT] = coin%2;
                        
                        // check if there is a winner using the depth first serach algorithm
                        if (dfs(gameTable, wh, [yT, xT], coin%2)) {
                            hasWinner = true;
                        } else {
                            // TODO check draw: if no -1 left in gameTable
                            coin++;
                        }
                    }
                }
            } 
        }
        if (hasWinner) {
            let w = coin%2;
            io.emit("winner", 
                {"winner": joinedUsers[whosPlaying[w]],
                 "color": colors[w]}
            ); 
        }
    });

    socket.on("resetGame", data => {
        // sets everything to defaults
        hasWinner = false;
        coin = 0;

        for (i in gameTable) {
            for (j in gameTable[i]) {
                gameTable[i][j] = -1;
            }
        }
        // resets everyone's tables to be empty according to the server side gameTable
        // TODO this also removes the "x IS THE WINNER" message client side (which should be done elsewhere really)
        io.emit("loadGameTable", 
            {"table":gameTable, "colors":colors});

    })

});
