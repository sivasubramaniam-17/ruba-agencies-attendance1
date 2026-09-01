import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { signLocationToken } from "@/lib/location-token"

// The web app calls this (while logged in) to get a token for the native
// background uploader, so it can post location without the session cookie.
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    return NextResponse.json({ token: signLocationToken(user.id) })
  } catch (error) {
    console.error("Error issuing location token:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
