let express = require("express");
let app = express();
let serv = require("http").Server(app);
const port = process.env.PORT || 5000;

app.get("/", function(req, res) {
	res.sendFile(__dirname + "/client/index.html");
})

app.use("/client",express.static(__dirname + "/client"));

serv.listen(port);

let SOCKET_LIST = {};

let io = require("socket.io")(serv,{});
io.sockets.on("connection", function(socket) {
	socket.id = Math.random();
	SOCKET_LIST[socket.id] = socket;
	
	socket.on("discconect", function() {
		delete SOCKET_LIST[socket.id];
	});
	
	socket.emit("serverMsg", {
		msg : "server test",
	})
});

setInterval(function(){
	for (const i in SOCKET_LIST) {
		let socket = SOCKET_LIST[i];
		
	}
	
},(1000/25))