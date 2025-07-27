import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { baseSalary, overtimePay, bonuses, deductions, workingDays, presentDays, isPaid } = body

    const totalSalary =
      Number.parseFloat(baseSalary) +
      Number.parseFloat(overtimePay || "0") +
      Number.parseFloat(bonuses || "0") -
      Number.parseFloat(deductions || "0")
    const absentDays = Number.parseInt(workingDays) - Number.parseInt(presentDays)

    const updateData: any = {
      baseSalary: Number.parseFloat(baseSalary),
      overtimePay: Number.parseFloat(overtimePay || "0"),
      bonuses: Number.parseFloat(bonuses || "0"),
      deductions: Number.parseFloat(deductions || "0"),
      totalSalary,
      workingDays: Number.parseInt(workingDays),
      presentDays: Number.parseInt(presentDays),
      absentDays,
      isPaid,
    }

    if (isPaid && !(await prisma.salaryRecord.findFirst({ where: { id: params.id, isPaid: true } }))) {
      updateData.paidAt = new Date()
    }

    const salaryRecord = await prisma.salaryRecord.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({ record: salaryRecord })
  } catch (error) {
    console.error("Error updating salary record:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.salaryRecord.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: "Salary record deleted successfully" })
  } catch (error) {
    console.error("Error deleting salary record:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
