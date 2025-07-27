import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // Create system settings
  await prisma.systemSettings.upsert({
    where: { id: "settings_001" },
    update: {},
    create: {
      id: "settings_001",
      workingHoursStart: "09:00",
      workingHoursEnd: "17:00",
      lateThreshold: 15,
      overtimeThreshold: 8.0,
      weekendDays: ["SATURDAY", "SUNDAY"],
      companyName: "Ruba Agencies",
      companyAddress: "123 Business Street, City, State 12345",
      companyPhone: "+1-555-0123",
      companyEmail: "info@rubaagencies.com",
    },
  })

  // Create admin user
  const hashedPassword = await bcrypt.hash("password", 10)

  await prisma.user.upsert({
    where: { email: "admin@rubaagencies.com" },
    update: {},
    create: {
      email: "admin@rubaagencies.com",
      password: hashedPassword,
      firstName: "Admin",
      lastName: "User",
      employeeId: "EMP001",
      department: "Administration",
      position: "System Administrator",
      role: "ADMIN",
      salary: 100000.0,
      joinDate: new Date("2024-01-01"),
      isActive: true,
    },
  })



  // Get all non-admin users for creating sample data
  const users = await prisma.user.findMany({
    where: { role: { not: "ADMIN" } },
  })

  // Create sample attendance records for the last 7 days
  for (let i = 1; i <= 7; i++) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)

    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue

    for (const user of users) {
      const checkInHour = 8 + Math.random() * 1.5 // 8:00-9:30 AM
      const checkOutHour = 17 + Math.random() * 1.5 // 5:00-6:30 PM

      const checkInTime = new Date(date)
      checkInTime.setHours(Math.floor(checkInHour), Math.floor((checkInHour % 1) * 60))

      const checkOutTime = new Date(date)
      checkOutTime.setHours(Math.floor(checkOutHour), Math.floor((checkOutHour % 1) * 60))

      const totalHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)
      const overtimeHours = totalHours > 8 ? totalHours - 8 : 0

      await prisma.attendanceRecord.upsert({
        where: {
          userId_date: {
            userId: user.id,
            date: date,
          },
        },
        update: {},
        create: {
          userId: user.id,
          date: date,
          checkInTime: checkInTime,
          checkOutTime: checkOutTime,
          totalHours: Math.round(totalHours * 100) / 100,
          
          status: "PRESENT",
          checkInMethod: "MANUAL",
          checkOutMethod: "MANUAL",
          isLate: checkInTime.getHours() >= 9 && checkInTime.getMinutes() > 15,
          isEarlyLeave: checkOutTime.getHours() < 17,
          checkInLocation: "Office",
          checkOutLocation: "Office",
        },
      })
    }
  }

  // Create sample leave requests
  if (users.length > 0) {
    await prisma.leaveRequest.upsert({
      where: { id: "leave_001" },
      update: {},
      create: {
        id: "leave_001",
        userId: users[0].id,
        leaveType: "ANNUAL",
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
        totalDays: 3,
        reason: "Family vacation",
        status: "PENDING",
      },
    })

    if (users.length > 1) {
      await prisma.leaveRequest.upsert({
        where: { id: "leave_002" },
        update: {},
        create: {
          id: "leave_002",
          userId: users[1].id,
          leaveType: "SICK",
          startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          totalDays: 2,
          reason: "Medical appointment",
          status: "APPROVED",
          approvedAt: new Date(),
        },
      })
    }

    if (users.length > 2) {
      await prisma.leaveRequest.upsert({
        where: { id: "leave_003" },
        update: {},
        create: {
          id: "leave_003",
          userId: users[2].id,
          leaveType: "CASUAL",
          startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          totalDays: 3,
          reason: "Personal matters",
          status: "REJECTED",
          rejectedAt: new Date(),
          rejectionReason: "Insufficient leave balance",
        },
      })
    }
  }


  // Create sample notifications
  await prisma.notification.create({
    data: {
      title: "New Leave Request",
      message: "John Doe has submitted a new leave request for approval",
      type: "INFO",
      isRead: false,
    },
  })

  await prisma.notification.create({
    data: {
      title: "Late Check-in Alert",
      message: "3 employees checked in late today",
      type: "WARNING",
      isRead: false,
    },
  })

  await prisma.notification.create({
    data: {
      title: "Monthly Report Ready",
      message: "Attendance report for this month is ready for download",
      type: "SUCCESS",
      isRead: true,
    },
  })

  console.log("✅ Database seeded successfully!")
  console.log("\n🔐 Login Credentials:")
  console.log("👤 Admin: admin@rubaagencies.com (password: password)")
  console.log("👤 Employee: john.doe@rubaagencies.com (password: password)")
  console.log("👤 Manager: jane.smith@rubaagencies.com (password: password)")
  console.log("👤 HR: mike.johnson@rubaagencies.com (password: password)")
  console.log("👤 Employee: sarah.wilson@rubaagencies.com (password: password)")
  console.log("\n📊 Sample Data Created:")
  console.log("✅ 5 Users with different roles")
  console.log("✅ 7 days of attendance records")
  console.log("✅ 3 leave requests (pending, approved, rejected)")
  console.log("✅ Monthly salary records")
  console.log("✅ System notifications")
  console.log("✅ Company settings configured")
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
