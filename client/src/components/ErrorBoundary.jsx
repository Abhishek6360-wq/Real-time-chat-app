import React from 'react';
import { useRouteError, useNavigate } from 'react-router-dom';
import './ErrorBoundary.css';

const ErrorBoundary = () => {
    const error = useRouteError();
    const navigate = useNavigate();

    console.error(error);

    return (
        <div className="error-container">
            <div className="error-card glass-panel">
                <div className="error-icon">⚠️</div>
                <h2>Oops! Something went wrong.</h2>
                <p className="error-msg">
                    {error.status === 404
                        ? "The page or chat you're looking for doesn't exist."
                        : error.statusText || error.message || "An unexpected error occurred."}
                </p>

                <div className="error-actions">
                    <button className="btn-primary" onClick={() => navigate('/')}>
                        Return Home
                    </button>
                    <button className="btn-secondary" onClick={() => window.location.reload()}>
                        Try Again
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ErrorBoundary;
