const { readFileSync } = require("fs");
const { Server } = require("socket.io");
const httpServer = require("https").createServer({
  key: readFileSync("./certificate/key.pem"),
  cert: readFileSync("./certificate/cert.pem"),
});
const io = new Server(httpServer);
const checkWin = require("./checkIfWin");

const games = {};

const uuid = () => {
  return "xxxx-xxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

io.on("connection", (socket) => {
  socket.on("disconnecting", () => {
    const roomsSocketIn = Array.from(io.sockets.adapter.rooms);
    roomsSocketIn.forEach((room) => {
      if (Array.from(room[1]).includes(socket.id)) {
        if (room[0] !== socket.id) {
          io.sockets.to(room[0]).emit("endGame", {
            isInGame: false,
            message: "Vous avez gagné la partie",
          });
          io.sockets.adapter.rooms.get(room[0]).forEach((s) => {
            io.sockets.sockets.get(s).leave(room[0]);
          });
        }
        socket.leave(room[0]);
      }
    });
  });

  socket.on("getCode", (msg) => {
    const room = io.sockets.adapter.rooms.get(msg.code);
    if (room != undefined) {
      socket.leave(msg.code);
    }
    const code = uuid();
    socket.emit("getCode", { code: code });
    socket.join(code);
  });

  socket.on("play", (msg) => {
    const playerID = socket.id;
    const currentSigne = msg.signe === "X" ? "O" : "X";
    let myMorpion;
    let result;
    if (games[msg.code] == undefined) {
      io.to(msg.code).emit("error", { error: true, msg: "Games not defined" });
    }
    games[msg.code].forEach((element) => {
      if (element[0] == playerID) {
        if (element[1] == currentSigne) {
          myMorpion = msg.morpion;
          myMorpion[msg.x][msg.y] = currentSigne;
          result = checkWin(myMorpion);
          if (result === "") {
            io.sockets.to(msg.code).emit("play", {
              signe: currentSigne,
              morpion: myMorpion,
            });
          }
        }
      }
    });
    if (result !== "" && result != undefined && result != "J") {
      games[msg.code].forEach((element) => {
        if (element[1] == result) {
          io.sockets.sockets.get(element[0]).emit("win", {
            isInGame: false,
            message: "Vous avez gagné la partie",
          });
        } else {
          io.sockets.sockets.get(element[0]).emit("loose", {
            isInGame: false,
            message: "Vous avez perdu la partie",
          });
        }
      });
      io.sockets.adapter.rooms.get(msg.code).forEach((s) => {
        io.sockets.sockets.get(s).leave(msg.code);
      });
    } else if (result === "J") {
      io.to(msg.code).emit("egalite", {
        isInGame: false,
        message: "Vous avez fait un egalité",
      });
    }
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
        let signeNumber = 0;

        room.forEach((user) => {
          io.sockets.sockets.get(user).emit("start", {
            isInGame: true,
            code: msg.code,
            userID: user,
            yourSigne: signeNumber == 0 ? "X" : "O",
          });
          players = [];
          players.push(user);
          players.push(signeNumber == 0 ? "X" : "O");
          final.push(players);
          signeNumber++;
        });
        games[msg.code] = final;
      }
    }
  });
});

httpServer.listen(3000, "ip");
