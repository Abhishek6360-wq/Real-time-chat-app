import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as loginApi, register as registerApi, logout as logoutApi } from '../api/auth';
import { toast } from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is already logged in on mount
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (storedUser && token) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (credentials) => {
        try {
            const response = await loginApi(credentials);
            if (response.success) {
                const token = response.data?.accessToken || response.data?.token;
                const userObj = response.data?.user || { email: credentials.email };
                localStorage.setItem('user', JSON.stringify(userObj));
                localStorage.setItem('token', token);
                setUser(userObj);
                toast.success(response.message || 'Login successful!');
                return { success: true };
            } else {
                toast.error(response.message || 'Login failed');
                return { success: false, error: response.message };
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Login failed';
            toast.error(errorMsg);
            return { success: false, error: errorMsg };
        }
    };

    const register = async (userData) => {
        try {
            const response = await registerApi(userData);
            if (response.success) {
                const token = response.data?.token || response.data?.accessToken;
                const userObj = response.data?.user || { username: userData.username, email: userData.email };
                localStorage.setItem('user', JSON.stringify(userObj));
                localStorage.setItem('token', token);
                setUser(userObj);
                toast.success(response.message || 'Registration successful!');
                return { success: true };
            } else {
                toast.error(response.message || 'Registration failed');
                return { success: false, error: response.message };
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Registration failed';
            toast.error(errorMsg);
            return { success: false, error: errorMsg };
        }
    };

    const logout = async () => {
        await logoutApi();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        toast.success("Logged out successfully");
    };

    return (
        <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
