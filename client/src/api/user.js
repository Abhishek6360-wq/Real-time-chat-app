import axios from 'axios';

const backendurl = import.meta.env.VITE_BACKEND_URL;

export const updateProfile = async (formData) => {
    const token = localStorage.getItem('token');

    const { data } = await axios.patch(backendurl + '/api/users/profile', formData, {
        headers: {
            // Let the browser set the boundary for multipart/form-data automatically
            'Content-Type': 'multipart/form-data',
            'usertoken': token // passing the token for authentication
        }
    });
    return data;
};

export const blockUser = async (userId) => {
    const token = localStorage.getItem('token');
    const { data } = await axios.patch(`${backendurl}/api/users/block`, { userId }, {
        headers: {
            'Content-Type': 'application/json',
            'usertoken': token
        }
    });
    return data;
};

export const unblockUser = async (userId) => {
    const token = localStorage.getItem('token');
    const { data } = await axios.patch(`${backendurl}/api/users/unblock`, { userId }, {
        headers: {
            'Content-Type': 'application/json',
            'usertoken': token
        }
    });
    return data;
};
