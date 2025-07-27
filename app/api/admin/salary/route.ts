import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["ADMIN", "HR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (!month || !year) {
      return NextResponse.json(
        { error: "Month and year are required" },
        { status: 400 }
      );
    }

    const salaryRecords = await prisma.salaryRecord.findMany({
      where: {
        month: Number(month),
        year: Number(year),
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
    });

    return NextResponse.json({ salaryRecords });
  } catch (error) {
    console.error("Error fetching salary records:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["ADMIN", "HR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const { userId, month, year, calculation } = data;

    if (!userId || !month || !year || !calculation) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create or update salary record
    const salaryRecord = await prisma.salaryRecord.upsert({
      where: {
        userId_month_year: {
          userId,
          month: Number(month),
          year: Number(year),
        },
      },
      create: {
        userId,
        month: Number(month),
        year: Number(year),
        baseSalary: calculation.baseSalary,
        workingDays: calculation.workingDays,
        presentDays: calculation.presentDays,
        absentDays: calculation.absentDays,
        leaveDays: calculation.leaveDays,
        lateCount: calculation.lateCount,
        totalLateMinutes: calculation.totalLateMinutes,
        lateDeductions: calculation.lateDeductions,
        leaveDeductions: calculation.leaveDeductions,
        uninformedLeaveDeductions: calculation.uninformedLeaveDeductions,
        weekendDeductions: calculation.weekendLeaveDeductions,
        totalSalary: calculation.totalSalary,
      },
      update: {
        baseSalary: calculation.baseSalary,
        workingDays: calculation.workingDays,
        presentDays: calculation.presentDays,
        absentDays: calculation.absentDays,
        leaveDays: calculation.leaveDays,
        lateCount: calculation.lateCount,
        totalLateMinutes: calculation.totalLateMinutes,
        lateDeductions: calculation.lateDeductions,
        leaveDeductions: calculation.leaveDeductions,
        uninformedLeaveDeductions: calculation.uninformedLeaveDeductions,
        weekendDeductions: calculation.weekendLeaveDeductions,
        totalSalary: calculation.totalSalary,
      },
    });

    return NextResponse.json({ salaryRecord });
  } catch (error) {
    console.error("Error saving salary record:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
