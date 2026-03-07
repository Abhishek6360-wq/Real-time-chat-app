import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Protectedlayout = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/Authentication" replace />;
    }

    return <Outlet />;
};

export default Protectedlayout;