// prevent using up my precious Render server :(
const isSafe = ['localhost', '127.0.0.1', '::1'].includes(location.hostname) || /^\d+(\.\d+){3}$/.test(location.hostname) || req.url.startsWith('file://');
let socket = io((isSafe) ? ("") : ("https://budget-uno.onrender.com"));
let serverID = "";		

socket.on("serverStatsChange", function(data) {
	console.log(data);
	document.querySelector("#serverSockets").textContent = "Sockets: " + data.sockets;
});

socket.on("serverLeave", function(id) {
	document.querySelector("#serverID").className = "invisible";
	document.querySelector("#leaveServer").className = "invisible";
	document.querySelector("#serverSockets").className = "invisible";
	document.querySelector("#serverID").textContent = "";
	document.querySelector("#leaveServer").className = "invisible";
	document.querySelector("#destroyServer").className = "invisible";
	serverID = "";
})

socket.on("serverJoin", function(id) {
	document.querySelector("#serverID").className = "";
	document.querySelector("#leaveServer").className = "";
	document.querySelector("#serverSockets").className = "";
	document.querySelector("#serverID").textContent = "Server ID: " + id;
	serverID = id;
})

document.querySelector("#createServer").onclick = function() {
	socket.emit("createServer");
	document.querySelector("#destroyServer").className = "";
}

document.querySelector("#submitCode").onclick = function() {
	socket.emit("serverJoin","G-" + document.querySelector("#codeEnter").value);
}

document.querySelector("#leaveServer").onclick = function() {
	socket.emit("serverLeave",serverID);
}

document.querySelector("#destroyServer").onclick = function() {
	socket.emit("forceClear",serverID);
}