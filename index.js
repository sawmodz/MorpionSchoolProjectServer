const httpServer = require("http").createServer();
const io = require("socket.io")(httpServer);

const games = {};

const uuid = () => {
  return "xxxx-xxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

io.on("connection", (socket) => {
  socket.on("getCode", () => {
    const code = uuid();
    socket.emit("getCode", { code: code });
    socket.join(code);
  });

  socket.on("play", (msg) => {
    const playerID = socket.id;
    const currentSigne = msg.signe === "X" ? "O" : "X";
    games[msg.code].forEach((element) => {
      if (element[0] == playerID) {
        if (element[1] == currentSigne) {
          let myMorpion = msg.morpion;
          myMorpion[msg.x][msg.y] = currentSigne;
          io.sockets.to(msg.code).emit("play", {
            signe: currentSigne,
            morpion: myMorpion,
          });
        } else {
          return;
        }
      }
    });
  });

  socket.on("joinRoom", (msg) => {
    const room = io.sockets.adapter.rooms.get(msg.code);
    if (room == undefined) {
      socket.emit("joinRoom", { error: "La salle n'existe pas" });
    } else {
      const sizeOfRoom = Array.from(room).length;
      if (sizeOfRoom == 0) {
        socket.emit("joinRoom", { error: "La salle n'existe pas" });
      } else if (sizeOfRoom >= 2) {
        socket.emit("joinRoom", { error: "La salle est pleine" });
      } else if (sizeOfRoom == 1) {
        socket.join(msg.code);
        socket.emit("joinRoom", { error: null, code: msg.code });

        final = [];
        players = [];
        players.push(Array.from(room)[0]);
        players.push("X");
        final.push(players);

        players = [];
        players.push(Array.from(room)[1]);
        players.push("O");
        final.push(players);

        games[msg.code] = final;

        io.sockets
          .to(msg.code)
          .emit("start", { isInGame: true, code: msg.code });
      }
    }
  });
});

httpServer.listen(3001);
