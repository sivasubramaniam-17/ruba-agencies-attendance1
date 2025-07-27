declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      employeeId: string
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: string
    employeeId: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    employeeId: string
  }
}
