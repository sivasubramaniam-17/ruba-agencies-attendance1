import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import bcrypt from "bcryptjs"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || (session.user.role !== "ADMIN" && session.user.role !== "HR")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const employee = await prisma.user.findUnique({
      where: { id: params.id },
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
        attendanceRecords: {
          take: 10,
          orderBy: { date: "desc" },
        },
        leaveRequests: {
          take: 5,
          orderBy: { createdAt: "desc" },
        },
        salaryRecords: {
          take: 12,
          orderBy: [{ year: "desc" }, { month: "desc" }],
        },
      },
    })

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    return NextResponse.json({ employee })
  } catch (error) {
    console.error("Error fetching employee:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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
      isActive,
      password,
    } = body

    // Check if employee ID or email already exists (excluding current employee)
    const existingUser = await prisma.user.findFirst({
      where: {
        AND: [
          { id: { not: params.id } },
          {
            OR: [{ email }, { employeeId }],
          },
        ],
      },
    })

    if (existingUser) {
      return NextResponse.json({ error: "Employee ID or email already exists" }, { status: 400 })
    }

    const updateData: any = {
      email,
      firstName,
      lastName,
      employeeId,
      department,
      position,
      role,
      salary: salary ? Number.parseFloat(salary.toString()) : null,
      joinDate: joinDate ? new Date(joinDate) : undefined,
      phone,
      address,
      emergencyContact,
      isActive: isActive !== undefined ? isActive : true,
    }

    // Only update password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    const employee = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
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
      message: "Employee updated successfully",
      employee,
    })
  } catch (error) {
    console.error("Error updating employee:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Soft delete by setting isActive to false
    await prisma.user.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    return NextResponse.json({
      success: true,
      message: "Employee deactivated successfully",
    })
  } catch (error) {
    console.error("Error deleting employee:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
