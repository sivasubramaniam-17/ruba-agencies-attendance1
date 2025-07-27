import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { calculateSalary } from "@/lib/salary-calculator";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["ADMIN", "HR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const { userId, month, year, baseSalary } = data;

    if (!userId || !month || !year || !baseSalary) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const calculation = await calculateSalary(
      userId,
      Number(month),
      Number(year),
      Number(baseSalary)
    );

    return NextResponse.json({ calculation });
  } catch (error) {
    console.error("Error calculating salary:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
