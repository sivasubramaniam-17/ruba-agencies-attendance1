import crypto from "crypto"

// Lightweight signed token so the native background service can post location
// without a browser session cookie. It's an HMAC-signed { uid, exp } payload
// (a minimal JWT) using NEXTAUTH_SECRET — no extra dependencies.

const SECRET = process.env.NEXTAUTH_SECRET || "insecure-dev-secret"
const b64url = (buf: Buffer | string) => Buffer.from(buf).toString("base64url")

export function signLocationToken(userId: string, days = 30): string {
  const payload = b64url(JSON.stringify({ uid: userId, exp: Date.now() + days * 86400000 }))
  const sig = b64url(crypto.createHmac("sha256", SECRET).update(payload).digest())
  return `${payload}.${sig}`
}

// Returns the userId if the token is valid and unexpired, else null.
export function verifyLocationToken(token: string): string | null {
  try {
    const [payload, sig] = token.split(".")
    if (!payload || !sig) return null
    const expected = b64url(crypto.createHmac("sha256", SECRET).update(payload).digest())
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
    const data = JSON.parse(Buffer.from(payload, "base64url").toString())
    if (!data.uid || typeof data.exp !== "number" || data.exp < Date.now()) return null
    return data.uid as string
  } catch {
    return null
  }
}
