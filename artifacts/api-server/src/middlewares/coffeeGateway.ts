import { randomUUID, createHmac } from "node:crypto";
import { clerkClient, getAuth } from "@clerk/express";
import cookieParser from "cookie-parser";
import type { Request, RequestHandler } from "express";
import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware";
import { coffeePort, gatewaySecret } from "../lib/coffee-runtime";
import { getClerkProxyHost } from "./clerkProxyMiddleware";

const key = process.env.SESSION_SECRET || process.env.CLERK_SECRET_KEY;
if (!key) throw new Error("A session signing key is required");
const guestKey = createHmac("sha256", key).update("purr-and-pour:guest:v1").digest("hex");
export const coffeeCookieParser = cookieParser(guestKey);

type Identity = { id: string; name: string; role: "customer" | "staff" | "admin" };
const identities = new WeakMap<Request, Identity>();
const roles = new Map<string, { expires: number; identity: Identity }>();
const rateLimits = new Map<string, { reset: number; count: number }>();

export const coffeeIdentity: RequestHandler = async (req, res, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    // SameSite=Lax guest cookies plus strict Origin and Fetch Metadata checks.
    const origin = req.get("origin");
    const host = getClerkProxyHost(req);
    let originAllowed = true;
    try { originAllowed = !origin || new URL(origin).host === host; }
    catch { originAllowed = false; }
    if (!originAllowed || req.get("sec-fetch-site") === "cross-site") {
      res.status(403).json({ error: "Cross-site changes are not allowed" });
      return;
    }
  }
  const auth = getAuth(req);
  let identity: Identity;
  if (auth.userId) {
    const cached = roles.get(auth.userId);
    if (cached && cached.expires > Date.now()) {
      identity = cached.identity;
    } else {
      const user = await clerkClient.users.getUser(auth.userId);
      const role = user.publicMetadata.role;
      identity = {
        id: `user:${user.id}`,
        name: (user.firstName || user.username || "Friend").replace(/[^\x20-\x7e]/g, "").slice(0, 80) || "Friend",
        role: role === "admin" || role === "staff" ? role : "customer",
      };
      roles.set(user.id, { expires: Date.now() + 30_000, identity });
      if (roles.size > 1000) for (const [id, value] of roles) if (value.expires < Date.now()) roles.delete(id);
    }
  } else {
    let guest: unknown = req.signedCookies?.coffee_guest;
    if (typeof guest !== "string" || !/^[0-9a-f-]{36}$/.test(guest)) {
      guest = randomUUID();
      res.cookie("coffee_guest", guest, {
        signed: true,
        httpOnly: true,
        secure: req.secure || req.get("x-forwarded-proto") === "https",
        sameSite: "lax",
        path: "/api",
        maxAge: 1000 * 60 * 60 * 24 * 180,
      });
    }
    identity = { id: `guest:${guest}`, role: "customer", name: "Friend" };
  }
  if (req.method === "POST") {
    const now = Date.now();
    // Per-owner and per-IP limits prevent signed-cookie rotation bypass.
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    for (const id of [identity.id, `ip:${ip}`]) {
      let limit = rateLimits.get(id);
      if (!limit || limit.reset < now) limit = { reset: now + 60_000, count: 0 };
      limit.count++;
      rateLimits.set(id, limit);
      if (limit.count > (id.startsWith("ip:") ? 60 : 10)) {
        res.status(429).json({ error: "Please wait a moment before placing another order" });
        return;
      }
    }
    if (rateLimits.size > 5000) for (const [id, value] of rateLimits) if (value.reset < now) rateLimits.delete(id);
  }
  identities.set(req, identity);
  next();
};

export const coffeeGateway = createProxyMiddleware<Request>({
  target: `http://127.0.0.1:${coffeePort}`,
  changeOrigin: true,
  pathRewrite: (_path, req) => req.originalUrl,
  proxyTimeout: 35 * 60 * 1000,
  on: {
    proxyReq(proxyReq, req) {
      const identity = identities.get(req);
      // Always overwrite untrusted client-supplied identity headers.
      proxyReq.setHeader("X-Coffee-Gateway", gatewaySecret);
      proxyReq.setHeader("X-Coffee-Identity", identity?.id || "");
      proxyReq.setHeader("X-Coffee-Role", identity?.role || "customer");
      proxyReq.setHeader("X-Coffee-Name", identity?.name || "Friend");
      proxyReq.removeHeader("cookie");
      proxyReq.removeHeader("authorization");
      fixRequestBody(proxyReq, req);
    },
    proxyRes(proxyRes) {
      proxyRes.headers["cache-control"] = "no-store";
      if (proxyRes.headers["content-type"]?.includes("text/event-stream")) {
        proxyRes.headers["x-accel-buffering"] = "no";
      }
    },
    error(_err, req, res) {
      req.log.error("Coffee backend unavailable");
      if ("writeHead" in res && !res.headersSent) {
        res.writeHead(503, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "The coffee shop is reconnecting. Please try again shortly." }));
      } else res.end();
    },
  },
});
