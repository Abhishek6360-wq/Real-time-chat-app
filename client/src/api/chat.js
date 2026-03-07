import axios from 'axios';

// The base URL for your backend server
const backendurl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const fetchAllChats = async (isArchived = false) => {
    const token = localStorage.getItem('token');

    // Making a simple GET request directly to the backend
    const { data } = await axios.get(backendurl + `/api/chats?archived=${isArchived}`, {
        headers: {
            'Content-Type': 'application/json',
            'usertoken': token // passing the token for authentication
        }
    });
    return data;
};

export const fetchMessages = async (chatId, page = 1, limit = 20) => {
    const token = localStorage.getItem('token');

    const { data } = await axios.get(backendurl + `/api/messages/${chatId}?page=${page}&limit=${limit}`, {
        headers: {
            'Content-Type': 'application/json',
            'usertoken': token
        }
    });
    return data;
};

export const sendMessage = async (chatId, content) => {
    const token = localStorage.getItem('token');

    const { data } = await axios.post(backendurl + '/api/messages',
        { chatId, content },
        {
            headers: {
                'Content-Type': 'application/json',
                'usertoken': token
            }
        }
    );
    return data;
};

export const sendMessageWithMedia = async (chatId, content, file, type) => {
    const token = localStorage.getItem('token');

    const formData = new FormData();
    formData.append("chatId", chatId);
    formData.append("type", type);
    if (content) formData.append("content", content);
    if (file) formData.append("file", file);

    const { data } = await axios.post(backendurl + '/api/messages',
        formData,
        {
            headers: {
                'Content-Type': 'multipart/form-data',
                'usertoken': token
            }
        }
    );
    return data;
};

export const searchUsers = async (searchTerm) => {
    const token = localStorage.getItem('token');

    const { data } = await axios.post(backendurl + '/api/users/search',
        { query: searchTerm },
        {
            headers: {
                'Content-Type': 'application/json',
                'usertoken': token
            }
        }
    );

    return data;
};

export const markMessagesAsRead = async (chatId) => {
    const token = localStorage.getItem('token');

    const { data } = await axios.patch(backendurl + `/api/messages/${chatId}/read`, {}, {
        headers: {
            'Content-Type': 'application/json',
            'usertoken': token
        }
    });
    return data;
};

export const createChat = async (userId) => {
    const token = localStorage.getItem('token');
    const { data } = await axios.post(backendurl + '/api/chats/one-to-one',
        { userId },
        {
            headers: {
                'Content-Type': 'application/json',
                'usertoken': token
            }
        }
    );
    return data;
};

export const createGroupChat = async (name, participants) => {
    const token = localStorage.getItem('token');
    const { data } = await axios.post(backendurl + '/api/chats/group',
        { name, participants },
        {
            headers: {
                'Content-Type': 'application/json',
                'usertoken': token
            }
        }
    );
    return data;
};

export const addMemberToGroup = async (chatId, userId) => {
    const token = localStorage.getItem('token');
    const { data } = await axios.post(backendurl + `/api/group/${chatId}/add-member`,
        { chatId, userId },
        { headers: { 'Content-Type': 'application/json', 'usertoken': token } }
    );
    return data;
};

export const removeMemberFromGroup = async (chatId, userId) => {
    const token = localStorage.getItem('token');
    const { data } = await axios.post(backendurl + `/api/group/${chatId}/remove-member`,
        { chatId, userId },
        { headers: { 'Content-Type': 'application/json', 'usertoken': token } }
    );
    return data;
};

export const renameGroup = async (chatId, name) => {
    const token = localStorage.getItem('token');
    const { data } = await axios.post(backendurl + `/api/group/rename`,
        { chatId, name },
        { headers: { 'Content-Type': 'application/json', 'usertoken': token } }
    );
    return data;
};

export const leaveGroup = async (chatId) => {
    const token = localStorage.getItem('token');
    const { data } = await axios.post(backendurl + `/api/group/leave`,
        { chatId },
        { headers: { 'Content-Type': 'application/json', 'usertoken': token } }
    );
    return data;
};

export const archiveChat = async (chatId) => {
    const token = localStorage.getItem('token');
    const { data } = await axios.post(backendurl + `/api/chats/archive`,
        { chatId },
        { headers: { 'Content-Type': 'application/json', 'usertoken': token } }
    );
    return data;
};

export const unarchiveChat = async (chatId) => {
    const token = localStorage.getItem('token');
    const { data } = await axios.post(backendurl + `/api/chats/unarchive`,
        { chatId },
        { headers: { 'Content-Type': 'application/json', 'usertoken': token } }
    );
    return data;
};
