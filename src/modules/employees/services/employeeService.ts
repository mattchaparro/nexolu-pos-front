import { httpClient } from '@/services/http/client'
import type {
  CreateEmployeePayload,
  Employee,
  PermissionCategory,
  UpdateEmployeePayload,
} from '@/types/employee'

// Sin paginacion: EmployeeController::index() devuelve la coleccion completa
// (un negocio no maneja cientos de empleados) y JsonResource::withoutWrapping()
// esta activo globalmente, asi que la respuesta es el array plano, no {data:[]}.
export async function fetchEmployees(): Promise<Employee[]> {
  const { data } = await httpClient.get<Employee[]>('/employees')
  return data
}

export async function createEmployee(payload: CreateEmployeePayload): Promise<Employee> {
  const { data } = await httpClient.post<Employee>('/employees', payload)
  return data
}

export async function updateEmployee(id: number, payload: UpdateEmployeePayload): Promise<Employee> {
  const { data } = await httpClient.put<Employee>(`/employees/${id}`, payload)
  return data
}

export async function toggleEmployee(id: number): Promise<Employee> {
  const { data } = await httpClient.patch<Employee>(`/employees/${id}/toggle`)
  return data
}

export async function deleteEmployee(id: number): Promise<void> {
  await httpClient.delete(`/employees/${id}`)
}

export async function fetchPermissionCatalog(): Promise<PermissionCategory[]> {
  const { data } = await httpClient.get<{ categories: PermissionCategory[] }>('/employees/permission-catalog')
  return data.categories
}

export async function updateEmployeePermissions(id: number, permissions: string[]): Promise<Employee> {
  const { data } = await httpClient.put<Employee>(`/employees/${id}/permissions`, { permissions })
  return data
}
