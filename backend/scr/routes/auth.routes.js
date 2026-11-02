
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import express from "express";
import User from "../models/User.js";

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /api/auth/google
// Body: { credential: "<Google ID token>" }
router.post("/google", async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ error: "credential is required" });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Upsert user
    let user = await User.findOne({ googleId });
    if (!user) {
      user = await User.create({ googleId, email, name, picture });
    } else {
      // Update name/picture in case they changed
      user.name = name;
      user.picture = picture;
      await user.save();
    }

    const token = jwt.sign(
      { userId: user._id.toString(), email, name, picture },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, user: { id: user._id, email, name, picture } });
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(401).json({ error: "Invalid Google credential" });
  }
});

// GET /api/auth/me — verify token and return user
router.get("/me", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token" });
  }
  try {
    const payload = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
    res.json({ user: payload });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
