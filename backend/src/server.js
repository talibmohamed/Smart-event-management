import dotenv from "dotenv";
import { createServer } from "http";
import app from "./app.js";
import { initializeSocketServer } from "./utils/socket.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const server = createServer(app);

initializeSocketServer(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
