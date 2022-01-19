const { readFileSync } = require("fs");
const { Server } = require("socket.io");
const httpServer = require("https").createServer({
  key: readFileSync("./certificate/key.pem"),
  cert: readFileSync("./certificate/cert.pem"),
});
const io = new Server(httpServer);
const checkWin = require("./checkIfWin");

const games = {};

const history = {};

const uuid = () => {
  return "xxxx-xxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

io.on("connection", (socket) => {
  socket.on("replay", (msg) => {
    const roomsSocketIn = Array.from(io.sockets.adapter.rooms);
    roomsSocketIn.forEach((value) => {
      if (value[0].length == 9 && Array.from(value[1]).includes(msg.id)) {
        socket.emit("replay", {
          error: true,
          message: "Joueur déja en partie",
        });
        return;
      }
    });

    let player = io.sockets.sockets.get(msg.id);
    if (player == undefined) {
      socket.emit("replay", {
        error: true,
        message: "Le joueur n'est plus connecté",
      });
      return;
    }
    if (msg.replay) {
      let mycode = getMyCode({ code: msg.code }, socket);
      createParty({ code: mycode }, player);
    } else {
      player.emit("replay", { error: false, demande: true, id: socket.id });
    }
  });

  socket.on("disconnecting", () => {
    const roomsSocketIn = Array.from(io.sockets.adapter.rooms);
    delete history[socket.id];
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
          delete games[room[0]];
        }
        socket.leave(room[0]);
      }
    });
  });

  socket.on("getCode", (msg) => {
    getMyCode(msg, socket);
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
      let i = 1;
      games[msg.code].forEach((element) => {
        if (element[1] == result) {
          let historys = [];
          const otheruuid = games[msg.code][i][0];
          if (history[element[0]] != undefined) {
            historys = history[element[0]];
            historys.push({ id: otheruuid, result: "Gagné", play: element[1] });
          } else {
            historys.push({ id: otheruuid, result: "Gagné", play: element[1] });
          }
          history[element[0]] = historys;
          io.sockets.sockets.get(element[0]).emit("win", {
            isInGame: false,
            message: "Vous avez gagné la partie",
            history: history[element[0]],
          });
        } else {
          let historys = [];
          const otheruuid = games[msg.code][i][0];
          if (history[element[0]] != undefined) {
            historys = history[element[0]];
            historys.push({ id: otheruuid, result: "Perdu", play: element[1] });
          } else {
            historys.push({ id: otheruuid, result: "Perdu", play: element[1] });
          }
          history[element[0]] = historys;
          io.sockets.sockets.get(element[0]).emit("loose", {
            isInGame: false,
            message: "Vous avez perdu la partie",
            history: history[element[0]],
          });
        }
        i--;
      });
      io.sockets.adapter.rooms.get(msg.code).forEach((s) => {
        io.sockets.sockets.get(s).leave(msg.code);
      });
      delete games[msg.code];
    } else if (result === "J") {
      let i = 1;
      games[msg.code].forEach((element) => {
        let historys = [];
        const otheruuid = games[msg.code][i][0];
        if (history[element[0]] != undefined) {
          historys = history[element[0]];
          historys.push({ id: otheruuid, result: "Egalité", play: element[1] });
        } else {
          historys.push({ id: otheruuid, result: "Egalité", play: element[1] });
        }
        history[element[0]] = historys;
        io.sockets.sockets.get(element[0]).emit("egalite", {
          isInGame: false,
          message: "Vous avez fait un egalité",
          history: history[element[0]],
        });
        i--;
      });
      io.sockets.adapter.rooms.get(msg.code).forEach((s) => {
        io.sockets.sockets.get(s).leave(msg.code);
      });
      delete games[msg.code];
    }
  });

  socket.on("joinRoom", (msg) => {
    createParty(msg, socket);
  });
});

const getMyCode = (msg, socket) => {
  const room = io.sockets.adapter.rooms.get(msg.code);
  if (room != undefined) {
    socket.leave(msg.code);
  }
  const code = uuid();
  socket.emit("getCode", { code: code });
  socket.join(code);
  return code;
};

const createParty = (msg, socket) => {
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
      let signeNumber = Math.floor(Math.random() * (1 - 0 + 1)) + 0;

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
        signeNumber = signeNumber == 1 ? 0 : 1;
      });
      games[msg.code] = final;
    }
  }
};

httpServer.listen(3000);
