import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import accessibilityRoutes from "../routes/accessibility.js";
import routesRouter from "../routes/routes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  })
);

app.use((req, res, next) => {
  res.setTimeout(30000);
  next();
});

app.use(express.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Content-Length, X-Requested-With, Accept"
  );
  next();
});

app.use("/api/accessibility", accessibilityRoutes);
app.use("/api/routes", routesRouter);

app.get("/", (req, res) => {
  res.json({ message: "MobAcesso API está funcionando!" });
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
