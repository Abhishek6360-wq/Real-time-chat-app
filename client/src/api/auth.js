import axios from 'axios';

// The base URL for your backend server
const backendurl = import.meta.env.VITE_BACKEND_URL;

export const login = async (credentials) => {
    // Making a simple POST request directly to the backend
    const { data } = await axios.post(backendurl + '/api/auth/login', credentials, {
        headers: {
            'Content-Type': 'application/json'
        }
    });
    return data;
};

export const register = async (userData) => {
    // Making a direct POST request for registration
    const { data } = await axios.post(backendurl + '/api/auth/register', userData, {
        headers: {
            'Content-Type': 'application/json'
        }
    });
    return data;
};

export const logout = async () => {
    try {
        const token = localStorage.getItem('token');
        // Sending the logout request with the user's token attached
        await axios.get(backendurl + '/api/auth/logout', {
            headers: {
                'usertoken': token
            }
        });
    } catch (e) {
        console.error('Logout API failed:', e);
    }
    // Clean up local storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}
