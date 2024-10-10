
let socket = io();
let playerNb;
let nick;

let joinButton = document.getElementById("join");
let leaveButton = document.getElementById("leave");


function join() {
    let n = document.getElementById("name").value;
    console.log(n + " joining the the party");
    socket.emit("newPlayer", n);
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
    socket.emit("playerLeave", playerNb);
}

function send() {
    let message = nick + " : " + inputMes.value + "\n";
    inputMes.value = "";
    socket.emit("sentMessage", message);
}

socket.on("currentPlayers", data => {
    playerList.innerHTML = "";
    console.log(data.listPlayers);
    for (let c in data.listPlayers) {
        playerList.innerHTML += data.listPlayers[c] + " ";
    }
})


socket.on("joinFailed", data => {
    console.log(data);
});

socket.on("loadGameTable", data => {
    let {table, colors} = data;
    for (let y of table) {
        for (let x of table) {
            if (table[y][x] != -1) {
                d3.select("#h" + (y*table.length + x)).attr("fill", colors[table[y][x]]);
            }
        }
    }
});

socket.on("newMessage", data => {
    chat.value += ( data + "\n");
});

socket.on("justPlayed", data => {
    d3.select("#h"+data.tile).attr("fill", data.color);
});

//implement
socket.on("winner", data => {
    console.log(data);
});

leaveButton.setAttribute("disabled",  "disabled");
sendMes.setAttribute("disabled", "disabled");
chat.value = ""; // erases the chat on reload / new tab