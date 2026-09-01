// Refleja EmployeeResource (app/Http/Resources/Api/V1/EmployeeResource.php)
// en nexolu-pos-api. Empleados y admins adicionales del propio negocio -
// distinto del dueño (is_business_owner), que siempre existe y no se lista
// aca via CRUD (ver EmployeeController).
export type EmployeeRole = 'employee' | 'admin'

export interface Employee {
  id: number
  name: string
  email: string
  is_active: boolean
  is_business_owner: boolean
  role: EmployeeRole
  /** Solo presente si role='employee' - un admin hereda todo por rol. */
  permissions: string[] | null
  /** Sedes a las que entra. Un admin entra a todas sin filas en el pivote. */
  branch_ids?: number[]
  default_branch_id: number | null
  last_active_at: string | null
}

export interface CreateEmployeePayload {
  name: string
  email: string
  password: string
  password_confirmation: string
  role: EmployeeRole
  permissions?: string[]
  branch_ids?: number[]
}

export interface UpdateEmployeePayload {
  name: string
  email: string
  password?: string
  password_confirmation?: string
  role: EmployeeRole
  permissions?: string[]
  /**
   * Solo se manda si el negocio es multisede. Omitirla conserva las sedes
   * que ya tenia (ver EmployeeController::syncBranches en la API): mandar
   * [] dejaria al empleado sin poder entrar a ninguna.
   */
  branch_ids?: number[]
}

// Refleja PermissionCatalog::categoriasParaUI() via
// EmployeeController::catalog() (GET /employees/permission-catalog).
export interface PermissionDefinition {
  name: string
  label: string
  description: string
  recommended: boolean
  warning: boolean
}

export interface PermissionCategory {
  key: string
  label: string
  icon: string
  permissions: PermissionDefinition[]
}
