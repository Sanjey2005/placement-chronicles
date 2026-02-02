'use server';

import axios from 'axios';

const SCRAPER_URL = process.env.SCRAPER_URL || '';

if (!SCRAPER_URL) {
    throw new Error(
        'Please define the SCRAPER_URL environment variable inside .env.local'
    );
}

interface LoginCredentials {
    username: string;
    password: string;
}

interface LoginResponse {
    success: boolean;
    cookies?: string[];
    dashboardUrl?: string;
    message?: string;
    error?: string;
}

/**
 * Server action to authenticate user via the scraper microservice
 * @param formData - Form data containing username and password
 * @returns Login response with cookies and dashboard URL
 */
export async function login(formData: FormData): Promise<LoginResponse> {
    try {
        const username = formData.get('username') as string;
        const password = formData.get('password') as string;

        if (!username || !password) {
            return {
                success: false,
                error: 'Username and password are required',
            };
        }

        const credentials: LoginCredentials = {
            username,
            password,
        };

        // Call the scraper microservice
        const response = await axios.post<LoginResponse>(
            `${SCRAPER_URL}/login`,
            credentials,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 30000, // 30 second timeout
            }
        );

        if (response.data.success) {
            return {
                success: true,
                cookies: response.data.cookies,
                dashboardUrl: response.data.dashboardUrl,
                message: 'Login successful',
            };
        } else {
            return {
                success: false,
                error: response.data.error || 'Login failed',
            };
        }
    } catch (error) {
        console.error('Login error:', error);

        if (axios.isAxiosError(error)) {
            if (error.code === 'ECONNREFUSED') {
                return {
                    success: false,
                    error: 'Unable to connect to authentication service',
                };
            }

            if (error.response) {
                return {
                    success: false,
                    error: error.response.data?.error || 'Authentication failed',
                };
            }

            if (error.request) {
                return {
                    success: false,
                    error: 'No response from authentication service',
                };
            }
        }

        return {
            success: false,
            error: 'An unexpected error occurred during login',
        };
    }
}

/**
 * Alternative login function that accepts credentials directly
 * @param username - User's username
 * @param password - User's password
 * @returns Login response
 */
export async function loginWithCredentials(
    username: string,
    password: string
): Promise<LoginResponse> {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    return login(formData);
}
