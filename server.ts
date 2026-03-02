import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory storage for sessions
// Structure: { [id: string]: { keyActivated: string, isInstalled: boolean, injectAttempts: number[] } }
const sessions: Record<string, { keyActivated: string; isInstalled: boolean; injectAttempts: number[] }> = {};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.set('trust proxy', true);

  // API Routes
  app.get("/api/check-session", (req, res) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const session = sessions[ip as string];
    
    if (session && session.keyActivated === 'New2026') {
      return res.json({ 
        active: true, 
        installed: session.isInstalled 
      });
    }
    
    res.json({ active: false, installed: false });
  });

  app.post("/api/verify", (req, res) => {
    const { key } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    
    if (key === "New2026") {
      if (!sessions[ip as string]) {
        sessions[ip as string] = { keyActivated: key, isInstalled: false, injectAttempts: [] };
      } else {
        sessions[ip as string].keyActivated = key;
      }
      
      return res.json({ success: true, isInstalled: sessions[ip as string].isInstalled });
    }
    
    res.status(401).json({ success: false, message: "Ключ неверный!" });
  });

  app.post("/api/install", (req, res) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    if (sessions[ip as string]) {
      sessions[ip as string].isInstalled = true;
    } else {
      // If for some reason they install without a session (shouldn't happen with UI flow)
      sessions[ip as string] = { keyActivated: 'New2026', isInstalled: true, injectAttempts: [] };
    }
    res.json({ success: true });
  });

  app.post("/api/inject", (req, res) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const session = sessions[ip as string];

    if (!session) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const now = Date.now();
    const twoMinutesAgo = now - 2 * 60 * 1000;

    // Filter attempts within the last 2 minutes
    session.injectAttempts = session.injectAttempts.filter(t => t > twoMinutesAgo);
    
    if (session.injectAttempts.length >= 5) {
      // Reset installation status as requested
      session.isInstalled = false;
      session.injectAttempts = []; // Clear attempts after failure
      return res.json({ 
        success: false, 
        error: "RATE_LIMIT",
        message: "Произошел сбой, возможно это связано с тем что вы инжектите чит очень быстро, из-за сбоя, ваш прогресс установки был полностью удалён, скачайте заново" 
      });
    }

    session.injectAttempts.push(now);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
