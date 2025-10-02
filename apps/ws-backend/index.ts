import { Server } from "socket.io";

const io = new Server({
  cors: {
    origin: "http://localhost:3000", // Allow connections from your Next.js app
    methods: ["GET", "POST"],
    credentials: true,
  },
});

let hostSocketId: string | null = null;
const connectedClients: Set<string> = new Set();
let clientsList: string[] = []; // Ordered list for turn rotation

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  connectedClients.add(socket.id);
  clientsList.push(socket.id);

  // First client becomes the host
  if (!hostSocketId) {
    hostSocketId = socket.id;
    socket.emit("assignRole", { role: "host" });
    console.log(`${socket.id} assigned as HOST`);
  } else {
    socket.emit("assignRole", { role: "client" });
    console.log(`${socket.id} assigned as CLIENT`);
  }

  // Broadcast current player count and turn info
  io.emit("playerCount", { count: connectedClients.size });
  io.emit("turnInfo", { currentHost: hostSocketId, playersList: clientsList });

  socket.on("drawTrajectory", (data) => {
    socket.broadcast.emit("drawTrajectory", data);
  });

  socket.on("adjustStriker", (data) => {
    socket.broadcast.emit("adjustStriker", data);
  });

  socket.on("strikerShot", (data) => {
    socket.broadcast.emit("strikerShot", data);
  });

  // Host sends authoritative physics updates
  socket.on("physicsUpdate", (data) => {
    if (socket.id === hostSocketId) {
      socket.broadcast.emit("physicsUpdate", data);
    }
  });

  socket.on("strikerPocketed", () => {
    socket.broadcast.emit("strikerPocketed");
  });

  socket.on("coinPocketed", (data) => {
    socket.broadcast.emit("coinPocketed", data);
  });

  socket.on("scoreUpdate", (data) => {
    socket.broadcast.emit("scoreUpdate", data);
  });

  socket.on("gameWon", (data) => {
    socket.broadcast.emit("gameWon", data);
  });

  socket.on("gameReset", () => {
    socket.broadcast.emit("gameReset");
  });

  socket.on("gameWon", (data) => {
    socket.broadcast.emit("gameWon", data);
  });

  socket.on("gameReset", () => {
    socket.broadcast.emit("gameReset");
  });

  // Handle turn end - switch host
  socket.on("endTurn", () => {
    console.log("=== END TURN RECEIVED ===");
    console.log("From socket:", socket.id);
    console.log("Current host:", hostSocketId);
    console.log("Clients count:", clientsList.length);

    if (socket.id === hostSocketId && hostSocketId && clientsList.length > 1) {
      console.log(`Turn ended by HOST ${socket.id}, switching roles...`);

      // Find current host index and switch to next player
      const currentIndex = clientsList.indexOf(hostSocketId);
      const nextIndex = (currentIndex + 1) % clientsList.length;
      const newHostId = clientsList[nextIndex];

      if (newHostId && connectedClients.has(newHostId)) {
        const oldHostId = hostSocketId;

        console.log(`Switching host from ${oldHostId} to ${newHostId}`);

        // Update host reference
        hostSocketId = newHostId;

        // Only send turnInfo - let clients determine their roles from this
        io.emit("turnInfo", {
          currentHost: hostSocketId,
          playersList: clientsList,
        });

        console.log(
          `Role switch completed via turnInfo: new host is ${hostSocketId}`
        );
      }
    } else {
      console.log(
        `Ignoring endTurn from ${socket.id} (not current host or insufficient players)`
      );
    }
    console.log("=== END TURN PROCESSING COMPLETE ===");
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    connectedClients.delete(socket.id);
    clientsList = clientsList.filter((id) => id !== socket.id);

    // If host disconnects, assign new host
    if (socket.id === hostSocketId) {
      hostSocketId = null;
      if (clientsList.length > 0) {
        const newHostId = clientsList[0];
        if (newHostId) {
          hostSocketId = newHostId;
          io.to(newHostId).emit("assignRole", { role: "host" });
          console.log(`New HOST assigned after disconnect: ${newHostId}`);
        }
      }
    }

    // Broadcast updated player count and turn info
    io.emit("playerCount", { count: connectedClients.size });
    io.emit("turnInfo", {
      currentHost: hostSocketId,
      playersList: clientsList,
    });
  });
});

io.listen(8080);
