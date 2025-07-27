"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calculator, DollarSign, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getMonthDetails, getCurrentMonthYear } from "@/lib/date-utils";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  department: string;
  position: string;
  salary: number | null;
}

interface SalaryRecord {
  id: string;
  userId: string;
  month: number;
  year: number;
  baseSalary: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  lateCount: number;
  lateDeductions: number;
  leaveDeductions: number;
  totalSalary: number;
  isPaid: boolean;
  user: {
    firstName: string;
    lastName: string;
    employeeId: string;
  };
}

interface SalaryCalculation {
  baseSalary: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  lateCount: number;
  totalLateMinutes: number;
  lateDeductions: number;
  leaveDeductions: number;
  totalDeductions: number;
  totalSalary: number;
  hourlyRate: number;
  minuteRate: number;
  dailyRate: number;
}

export function SalaryManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<number>(
    getCurrentMonthYear().month
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    getCurrentMonthYear().year
  );
  const [calculation, setCalculation] = useState<SalaryCalculation | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchEmployees();
    fetchSalaryRecords();
  }, [selectedMonth, selectedYear]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/admin/employees");
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchSalaryRecords = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/salary?month=${selectedMonth}&year=${selectedYear}`
      );
      if (response.ok) {
        const data = await response.json();
        setSalaryRecords(data.salaryRecords || []);
      }
    } catch (error) {
      console.error("Error fetching salary records:", error);
    } finally {
      setLoading(false);
    }
  };
  const calculateSalary = async () => {
    if (!selectedEmployee) {
      toast({
        title: "Error",
        description: "Please select an employee",
        variant: "destructive",
      });
      return;
    }

    const employee = employees.find((e) => e.id === selectedEmployee);
    if (!employee?.salary) {
      toast({
        title: "Error",
        description: "Selected employee doesn't have a base salary set",
        variant: "destructive",
      });
      return;
    }

    try {
      setCalculating(true);
      const response = await fetch("/api/admin/salary/calculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedEmployee,
          month: selectedMonth,
          year: selectedYear,
          baseSalary: employee.salary,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCalculation(data.calculation);
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to calculate salary",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while calculating salary",
        variant: "destructive",
      });
    } finally {
      setCalculating(false);
    }
  };

  const saveSalaryRecord = async () => {
    if (!selectedEmployee || !calculation) {
      return;
    }

    try {
      const response = await fetch("/api/admin/salary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedEmployee,
          month: selectedMonth,
          year: selectedYear,
          calculation,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Salary record saved successfully",
        });
        fetchSalaryRecords();
        setCalculation(null);
        setSelectedEmployee("");
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to save salary record",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while saving salary record",
        variant: "destructive",
      });
    }
  };

  const monthDetails = getMonthDetails(selectedYear, selectedMonth);
  const selectedEmployeeData = employees.find(
    (emp) => emp.id === selectedEmployee
  );

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - 2 + i
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <DollarSign className="h-8 w-8 text-green-600" />
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-green-900">
            Salary Management
          </h2>
          <p className="text-green-600">
            Calculate and manage employee salaries
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Salary Calculator */}
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <Calculator className="h-5 w-5" />
              Salary Calculator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Month/Year Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Month</Label>
                <Select
                  value={selectedMonth.toString()}
                  onValueChange={(value) =>
                    setSelectedMonth(Number.parseInt(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem
                        key={month.value}
                        value={month.value.toString()}
                      >
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(value) =>
                    setSelectedYear(Number.parseInt(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Month Details */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-blue-900">Month</div>
                    <div className="text-blue-700">
                      {monthDetails.monthName} {monthDetails.year}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-blue-900">
                      Working Days
                    </div>
                    <div className="text-blue-700">
                      {monthDetails.workingDays} days
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-blue-900">Total Days</div>
                    <div className="text-blue-700">
                      {monthDetails.totalDays} days
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-blue-900">Sundays</div>
                    <div className="text-blue-700">
                      {monthDetails.sundays} days
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Employee Selection */}
            <div className="space-y-2">
              <Label>Select Employee</Label>
              <Select
                value={selectedEmployee}
                onValueChange={setSelectedEmployee}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} (
                      {employee.employeeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Employee Details */}
            {selectedEmployeeData && (
              <Card className="bg-violet-50 border-violet-200">
                <CardContent className="pt-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-violet-900">Name:</span>
                      <span className="text-violet-700">
                        {selectedEmployeeData.firstName}{" "}
                        {selectedEmployeeData.lastName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-violet-900">
                        Employee ID:
                      </span>
                      <span className="text-violet-700">
                        {selectedEmployeeData.employeeId}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-violet-900">
                        Department:
                      </span>
                      <span className="text-violet-700">
                        {selectedEmployeeData.department}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-violet-900">
                        Position:
                      </span>
                      <span className="text-violet-700">
                        {selectedEmployeeData.position}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-violet-900">
                        Base Salary:
                      </span>
                      <span className="text-violet-700">
                        {selectedEmployeeData.salary
                          ? `₹${selectedEmployeeData.salary.toLocaleString()}`
                          : "Not set"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button
              onClick={calculateSalary}
              disabled={!selectedEmployee || calculating}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {calculating ? "Calculating..." : "Calculate Salary"}
            </Button>
          </CardContent>
        </Card>

        {/* Calculation Results */}
        <div className="space-y-6">
          {calculation && (
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-900">
                  <Calculator className="h-5 w-5" />
                  Calculation Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-green-900">
                      Base Salary
                    </div>
                    <div className="text-green-700">
                      ₹{calculation.baseSalary.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-green-900">
                      Working Days
                    </div>
                    <div className="text-green-700">
                      {calculation.workingDays} days
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-green-900">
                      Present Days
                    </div>
                    <div className="text-green-700">
                      {calculation.presentDays} days
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-green-900">
                      Absent Days
                    </div>
                    <div className="text-green-700">
                      {calculation.absentDays} days
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-green-900">Leave Days</div>
                    <div className="text-green-700">
                      {calculation.leaveDays} days
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-green-900">Late Count</div>
                    <div className="text-green-700">
                      {calculation.lateCount} times
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Rates */}
                <div className="space-y-2">
                  <h4 className="font-medium text-green-900">
                    Calculated Rates
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-green-800">
                        Daily Rate
                      </div>
                      <div className="text-green-600">
                        ₹{calculation.dailyRate.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-green-800">
                        Hourly Rate
                      </div>
                      <div className="text-green-600">
                        ₹{calculation.hourlyRate.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-green-800">
                        Minute Rate
                      </div>
                      <div className="text-green-600">
                        ₹{calculation.minuteRate.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Deductions */}
                <div className="space-y-2">
                  <h4 className="font-medium text-red-900">Deductions</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-red-800">Late Deductions:</span>
                      <span className="text-red-600">
                        ₹{calculation.lateDeductions.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-800">Leave Deductions:</span>
                      <span className="text-red-600">
                        ₹{calculation.leaveDeductions.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span className="text-red-900">Total Deductions:</span>
                      <span className="text-red-700">
                        ₹{calculation.totalDeductions.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Final Salary */}
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-green-900">
                      Final Salary:
                    </span>
                    <span className="text-xl font-bold text-green-700">
                      ₹{calculation.totalSalary.toLocaleString()}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={saveSalaryRecord}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  Save Salary Record
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Existing Salary Records */}
          <Card className="border-violet-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-violet-900">
                <Users className="h-5 w-5" />
                Salary Records - {monthDetails.monthName} {monthDetails.year}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">
                  Loading salary records...
                </div>
              ) : salaryRecords.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No salary records found for this month
                </div>
              ) : (
                <div className="space-y-3">
                  {salaryRecords.map((record) => (
                    <div
                      key={record.id}
                      className="p-4 border border-violet-200 rounded-lg"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-violet-900">
                            {record.user.firstName} {record.user.lastName}
                          </div>
                          <div className="text-sm text-violet-600">
                            ID: {record.user.employeeId}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Present: {record.presentDays}/{record.workingDays}{" "}
                            days
                            {record.lateCount > 0 &&
                              ` • Late: ${record.lateCount} times`}
                            {record.leaveDays > 0 &&
                              ` • Leave: ${record.leaveDays} days`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-700">
                            ₹{record.totalSalary.toLocaleString()}
                          </div>
                          <Badge
                            variant={record.isPaid ? "default" : "secondary"}
                            className="mt-1"
                          >
                            {record.isPaid ? "Paid" : "Pending"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
