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

  // Handle turn end - switch host
  socket.on("endTurn", () => {
    console.log("jjjjjj");

    if (socket.id === hostSocketId && hostSocketId && clientsList.length > 1) {
      console.log(`Turn ended by ${socket.id}, switching host...`);

      // Find current host index and switch to next player
      const currentIndex = clientsList.indexOf(hostSocketId);
      const nextIndex = (currentIndex + 1) % clientsList.length;
      const newHostId = clientsList[nextIndex];

      if (newHostId) {
        // Notify old host they're now a client
        io.to(hostSocketId).emit("assignRole", { role: "client" });

        // Assign new host
        hostSocketId = newHostId;
        io.to(newHostId).emit("assignRole", { role: "host" });

        console.log(`New HOST assigned: ${newHostId}`);

        // Broadcast turn change to all clients
        io.emit("turnInfo", {
          currentHost: hostSocketId,
          playersList: clientsList,
        });
      }
    }
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
