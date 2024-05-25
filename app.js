const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
	cors: {
		origin: "*",
		methods: ["GET", "POST"]
   }
});

const PORT = process.env.PORT || 3000;

let SOCKET_LIST = {};

app.use(express.static(__dirname + "/client"));

app.get("/", function(req, res) {
	res.sendFile(__dirname + "/client/index.html");
})

io.on("connection", function(socket) {
	console.log("connected!")
	socket.id = Math.random();
	SOCKET_LIST[socket.id] = socket;
	
	socket.on("discconect", function() {
		delete SOCKET_LIST[socket.id];
	});
	
	socket.emit("serverMsg", {
		msg : "server test",
	})
});

server.listen(PORT, () => console.log("server running!"))

setInterval(function(){
	for (const i in SOCKET_LIST) {
		let socket = SOCKET_LIST[i];		
	}
},(1000/25));