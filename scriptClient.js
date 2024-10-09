
let socket = io();
let nbPlayer;
let nick;

let joinButton = document.getElementById("join");
let leaveButton = document.getElementById("leave");


function join() {
    let n = document.getElementById("name").value;
    console.log(n + " joining the the party");
    socket.emit("join", n);
    nick = n;
    joinButton.setAttribute("disabled", "disabled");
    leaveButton.removeAttribute("disabled");
    sendMes.removeAttribute("disabled");
}

function leave() {
    console.log("leaving the party");
    leaveButton.setAttribute("disabled", "disabled");
    joinButton.removeAttribute("disabled");
    playerList.innerHTML = "";
    sendMes.setAttribute("disabled", "disabled");
    socket.emit("leave", nbPlayer);
}

function send() {
    let message = nick + " : " + inputMes.value + "\n";
    inputMes.value = "";
    socket.emit("sendMessage", message);
}

socket.on("playerList", data => {
    console.log(data.playerNb);
    nbPlayer = data.playerNb;
    playerList.innerHTML = "";
    console.log(data.listPlayers);
    for (let c in data.listPlayers) {
        playerList.innerHTML += data.listPlayers[c] + " ";
    }
})

socket.on("denied", data => {
    console.log(data);
});

socket.on("leaving", data => {
    let nbL = parseInt(data.nbL);
    playerList.innerHTML = "";
    for (let c in data.cList) playerList.innerHTML += data.cList[c];
    if (nbPlayer > nbL) {
        nbPlayer--;
        console.log("new player number: " + nbPlayer);
    }
});

socket.on("newPlayer", data => {
    playerList.innerHTML += data.name;
});

socket.on("newMessage", data => {
    chat.value += ( data + "\n");
});

socket.on("newTile", data => {
    document.getElementById("R" + data.hexId).setAttribute("fill", data.color);
});

leaveButton.setAttribute("disabled",  "disabled");
sendMes.setAttribute("disabled", "disabled");
chat.value = ""; // erases the chat on reload / new tab