/* (Thor)
 TODO make player colors work with css instead of hardcoding them to each element (would then just require changing a css class in an element)
*/
let socket = io();

let COLORS; // gets the colors from hexagoneScript.js createTable socket call
let currUsername; // username string
let colorIndex; // which color the player is (if they are a player)
const INIT_COLOR_HEX = "#293c3c";

function join() {
    // check to avoid whitespace/empty username (is also checked server side)
    if (nick.value.trim() == "") {
        console.log("Must give none whitespace username to join the game");
        return;
    }
    console.log(nick.value + " joining the the party");
    socket.emit("newPlayer", nick.value);
}

function leave() {
    console.log("leaving the party");

    playerList.innerHTML = "";
    sendMes.setAttribute("disabled", "disabled");
    inParty.style.display = "none";
    joinDiv.style.display = "flex";
    spectatorButtons.style.display = "block";

    socket.emit("playerLeave");
}

function send() {
    let message = inputMes.value + "\n";
    inputMes.value = "";
    socket.emit("sentMessage", message);
}

function spectStart() {
    socket.emit("changeView", 0);
}
function spectStepBack() {
    socket.emit("changeView", 1);
}
function spectStepForward() {
    socket.emit("changeView", 2);
}
function spectLive() {
    socket.emit("changeView", 3);
}

// displays a message saying whose turn it is depending on the coin's value
function displayWhoseTurn(coin) {
    if (coin != 0) {
        document.getElementById("PN" + ((coin-1)%2)).innerHTML = "";
    }
    let next = document.getElementById("PN" + (coin%2));
    // TODO make the whole name + arrows light up 
    // currently cant do it bc of the same issue as in the closest comment down
    next.innerHTML = ">>"
    next.style.color = COLORS[coin%2];
}

function resetGame() {
    socket.emit("resetGame");
}

socket.on("waiting", (callback) => {
    callback("got it!");
}) 

socket.on("currentPlayers", data => {
    playerList.innerHTML = "Current players:<br/>";
    console.log(data);
    for (let c in data) {
        //! bug for the first player when the second player connects,
        // first person cant see whose turn it is
        //console.log(data[c], document.getElementById(`${data[c]}`));
        if (document.getElementById(data[c]) == null)
            playerList.innerHTML += (`<div id=${data[c]}><div id=${'PN'+c} class="arrows"></div> ${data[c]}</div>`);
    }
});

socket.on("joinSuccess", data => {
    [ currUsername, colorIndex ] = data;

    // disable/enable buttons so that a player can only click buttons they're supposed to
    sendMes.removeAttribute("disabled");
    spectatorButtons.style.display = "none"

    // set html element displaying to the user their username and color
    playerName.style.color = COLORS[colorIndex];
    playerName.innerHTML = "Hello, " + currUsername;
    inParty.style.display = "flex";
    joinDiv.style.display = "none";
    displayWhoseTurn(0); // both players are in the middle of joining, so the turn is still at 0
});

socket.on("joinFailed", data => {
    console.log(data);
});

socket.on("loadGameTable", data => {
    let {table, colors} = data;
    //console.log(table);
    for (let y in table) {
        for (let x in table) {
            let id = parseInt(y)*table.length + parseInt(x);
            if (table[y][x] !== -1) {
                d3.select("#h" + id).attr("fill", colors[table[y][x]]);
            } else {
                d3.select("#h" + id).attr("fill", INIT_COLOR_HEX);
            }
        }
    }
    winnerMessage.style.display = "none";
});

socket.on("newView", data => {
    if (data.goBack) {
        d3.select("#h" + data.change[0]).attr("fill", INIT_COLOR_HEX);
    } else
        d3.select("#h" + data.change[0]).attr("fill", data.change[1]);
});

socket.on("newMessage", data => {
    chat.value += ( data + "\n");
});

socket.on("justPlayed", data => {
    let {tile, coin} = data;
    coin = parseInt(coin);
    d3.select("#h"+tile).attr("fill", COLORS[coin%2]);
    displayWhoseTurn(coin+1);
});

//implement
socket.on("winner", data => {
    winnerMessage.innerHTML = `${data["winner"]} IS THE WINNER!!!`;
    winnerMessage.style.color = data["color"];
    winnerMessage.style.display = "block";
    console.log(data);
});

sendMes.setAttribute("disabled", "disabled");
chat.value = ""; // erases the chat on reload / new tab


// So that hitting Enter in input field automatically presses the button
document.getElementById("nick")
    .addEventListener("keypress", (e) => {
        if (e.key == "Enter") join();
    });
document.getElementById("inputMes")
    .addEventListener("keypress", (e) => {
        if (e.key == "Enter") send();
    });
