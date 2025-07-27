import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import bcrypt from "bcryptjs"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || (session.user.role !== "ADMIN" && session.user.role !== "HR")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""
    const department = searchParams.get("department") || ""
    const role = searchParams.get("role") || ""

    const skip = (page - 1) * limit

    const where: any = {
      AND: [],
    }

    if (search) {
      where.AND.push({
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { employeeId: { contains: search, mode: "insensitive" } },
        ],
      })
    }

    if (department && department !== "all") {
      where.AND.push({ department: { contains: department, mode: "insensitive" } })
    }

    if (role && role !== "all") {
      where.AND.push({ role })
    }

    const [employees, total] = await Promise.all([
      prisma.user.findMany({
        where: where.AND.length > 0 ? where : {},
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          department: true,
          position: true,
          role: true,
          salary: true,
          joinDate: true,
          isActive: true,
          phone: true,
          address: true,
          emergencyContact: true,
          profileImage: true,
          createdAt: true,
          _count: {
            select: {
              attendanceRecords: {
                where: {
                  date: {
                    gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                  },
                },
              },
              leaveRequests: {
                where: {
                  status: "PENDING",
                },
              },
            },
          },
        },
      }),
      prisma.user.count({ where: where.AND.length > 0 ? where : {} }),
    ])

    return NextResponse.json({
      employees,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching employees:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      email,
      firstName,
      lastName,
      employeeId,
      department,
      position,
      role,
      salary,
      joinDate,
      phone,
      address,
      emergencyContact,
      password = "password123",
    } = body

    // Validate required fields
    if (!email || !firstName || !lastName || !employeeId || !department || !position) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if employee ID or email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { employeeId }],
      },
    })

    if (existingUser) {
      return NextResponse.json({ error: "Employee ID or email already exists" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const employee = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        employeeId,
        department,
        position,
        role: role || "EMPLOYEE",
        salary: salary ? Number.parseFloat(salary.toString()) : null,
        joinDate: joinDate ? new Date(joinDate) : new Date(),
        phone,
        address,
        emergencyContact,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        employeeId: true,
        department: true,
        position: true,
        role: true,
        salary: true,
        joinDate: true,
        isActive: true,
        phone: true,
        address: true,
        emergencyContact: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Employee created successfully",
      employee,
    })
  } catch (error) {
    console.error("Error creating employee:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
