import { Server } from "socket.io";

const io = new Server({
  cors: {
    origin: "http://localhost:3000", // Allow connections from your Next.js app
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("drawTrajectory", (data) => {
    socket.broadcast.emit("drawTrajectory", data);
  });

  socket.on("adjustStriker", (data) => {
    socket.broadcast.emit("adjustStriker", data);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

io.listen(8080);
