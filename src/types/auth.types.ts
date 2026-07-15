export type LoginPayload = {
    domain: string;
    email: string;
    emailOrMobile: string;
    user_pass: string;
    department: number;
};

export type Employee = {
    id: number;
    employee_code: string;
    employee_name: string;
    phoneNumber: string;
    email_id: string;
    user_type: number;
    userTypeName: string;
    user_name: string;
    employeePhoto?: string | null;
    signature?: string | null;
    gender?: number | null;
    dateOfBirth?: string | null;
    dateOfJoining?: string | null;
    address?: string | null;
    status?: string | null;
    global?: string | null;
};

export type LoginResponse = {
    status: number;
    success: boolean;
    message: string;
    access_token: string;
    employee: Employee;
    centreId: number;
};

export type AuthSession = {
    accessToken: string;
    centreId: number;
    employee: Employee;
};

export type ForgotPasswordRequestPayload = {
    email: string;
};

export type VerifyOtpPayload = {
    email: string;
    otp: string;
};

export type ResetPasswordPayload = {
    email: string;
    password: string;
};

export type BasicAuthResponse = {
    status?: number;
    success?: boolean;
    message?: string;
    data?: unknown;
};