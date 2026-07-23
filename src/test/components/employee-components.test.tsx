import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmployeeSearch } from "@/components/employees/employee-search";
import { EmployeeFilters } from "@/components/employees/employee-filters";
import { EmployeeRow } from "@/components/employees/employee-row";
import { EmployeeProfileDrawer } from "@/components/employees/employee-profile-drawer";
import { renderWithProviders } from "@/test/test-utils";
import type { Employee } from "@/lib/employees/types";

// Mock router navigate
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

const mockEmployee: Employee = {
  id: "emp-101",
  fullName: "Alice Smith",
  full_name: "Alice Smith",
  email: "alice@company.com",
  avatar: null,
  avatar_url: null,
  department: "Engineering",
  role: "manager",
  jobTitle: "Engineering Lead",
  job_title: "Engineering Lead",
  designation: "Engineering Lead",
  onlineStatus: true,
  is_online: true,
};

describe("EmployeeSearch Component", () => {
  it("renders search input correctly", () => {
    render(<EmployeeSearch value="" onChange={vi.fn()} />);
    const input = screen.getByPlaceholderText("Search by name or email...");
    expect(input).toBeInTheDocument();
  });

  it("calls onChange when text is entered", async () => {
    const handleChange = vi.fn();
    render(<EmployeeSearch value="" onChange={handleChange} />);
    const input = screen.getByPlaceholderText("Search by name or email...");
    await userEvent.type(input, "Alice");
    expect(input).toHaveValue("Alice");
  });

  it("renders clear button when value is present and clears search", async () => {
    const handleChange = vi.fn();
    render(<EmployeeSearch value="Alice" onChange={handleChange} />);
    const clearBtn = screen.getByLabelText("Clear search input");
    expect(clearBtn).toBeInTheDocument();

    await userEvent.click(clearBtn);
    expect(handleChange).toHaveBeenCalledWith("");
  });
});

describe("EmployeeFilters Component", () => {
  const departments = [
    { id: "d1", code: "ENG", name: "Engineering", description: null },
    { id: "d2", code: "HR", name: "Human Resources", description: null },
  ];

  it("renders department and role dropdown triggers", () => {
    render(
      <EmployeeFilters
        selectedDepartment=""
        onDepartmentChange={vi.fn()}
        selectedRole=""
        onRoleChange={vi.fn()}
        departments={departments}
        hasActiveFilters={false}
        onClearFilters={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Filter by department")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter by role")).toBeInTheDocument();
  });

  it("renders reset button when active filters exist and triggers callback", async () => {
    const handleClear = vi.fn();
    render(
      <EmployeeFilters
        selectedDepartment="Engineering"
        onDepartmentChange={vi.fn()}
        selectedRole=""
        onRoleChange={vi.fn()}
        departments={departments}
        hasActiveFilters={true}
        onClearFilters={handleClear}
      />,
    );

    const resetBtn = screen.getByLabelText("Clear all filters");
    expect(resetBtn).toBeInTheDocument();
    await userEvent.click(resetBtn);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });
});

describe("EmployeeRow Component", () => {
  it("renders employee details and triggers click on row", () => {
    const handleSelect = vi.fn();
    renderWithProviders(
      <table>
        <tbody>
          <EmployeeRow employee={mockEmployee} onSelect={handleSelect} />
        </tbody>
      </table>,
    );

    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("alice@company.com")).toBeInTheDocument();
    expect(screen.getByText("Engineering")).toBeInTheDocument();

    const row = screen.getByText("Alice Smith").closest("tr");
    if (row) fireEvent.click(row);
    expect(handleSelect).toHaveBeenCalledWith(mockEmployee);
  });
});

describe("EmployeeProfileDrawer Component", () => {
  it("renders drawer when open with employee info", () => {
    renderWithProviders(
      <EmployeeProfileDrawer employee={mockEmployee} open={true} onOpenChange={vi.fn()} />,
    );

    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("Engineering Lead")).toBeInTheDocument();
    expect(screen.getByText("alice@company.com")).toBeInTheDocument();
  });
});
