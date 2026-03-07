import React, { useState } from 'react';
import { searchUsers, createGroupChat } from '../api/chat';
import { useChat } from '../context/ChatContext';
import './CreateGroupModal.css';
import { toast } from 'react-hot-toast';

const CreateGroupModal = ({ isOpen, onClose }) => {
    const { loadChats } = useChat();
    const [groupName, setGroupName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSearch = async (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        if (!value.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            const result = await searchUsers(value);
            setSearchResults(result.data || []);
        } catch (error) {
            console.error("Failed to search users:", error);
        }
    };

    const toggleUserSelection = (userToToggle) => {
        if (selectedUsers.some(u => u._id === userToToggle._id)) {
            // Remove
            setSelectedUsers(prev => prev.filter(u => u._id !== userToToggle._id));
        } else {
            // Add
            setSelectedUsers(prev => [...prev, userToToggle]);
        }
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim()) {
            toast.error("Please enter a group name");
            return;
        }
        if (selectedUsers.length < 2) {
            toast.error("Please select at least 2 other members");
            return;
        }

        setIsLoading(true);
        try {
            const participantIds = selectedUsers.map(u => u._id);
            await createGroupChat(groupName, participantIds);

            toast.success("Group created successfully!");

            // Refresh chats list to see the new group
            await loadChats();

            // Reset and close
            setGroupName('');
            setSearchTerm('');
            setSearchResults([]);
            setSelectedUsers([]);
            onClose();

        } catch (error) {
            console.error("Failed to create group:", error);
            toast.error("Failed to create group.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content group-modal">
                <div className="modal-header">
                    <h2>Create Group Chat</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    <div className="form-group margin-bottom">
                        <label>Group Name</label>
                        <input
                            type="text"
                            className="settings-input"
                            placeholder="Enter group name..."
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>Add Members</label>
                        <input
                            type="text"
                            className="settings-input"
                            placeholder="Search users to add..."
                            value={searchTerm}
                            onChange={handleSearch}
                        />
                    </div>

                    {/* Selected Users Pills */}
                    {selectedUsers.length > 0 && (
                        <div className="selected-users-container">
                            {selectedUsers.map(u => (
                                <span key={u._id} className="selected-user-pill">
                                    {u.username}
                                    <button onClick={() => toggleUserSelection(u)}>&times;</button>
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Search Results Dropdown */}
                    {searchResults.length > 0 && (
                        <div className="search-results-box">
                            {searchResults.map((user) => {
                                const isSelected = selectedUsers.some(u => u._id === user._id);
                                return (
                                    <div
                                        key={user._id}
                                        className="search-result-item"
                                        onClick={() => toggleUserSelection(user)}
                                    >
                                        <div className="search-result-avatar">
                                            {user.username.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="search-result-name">{user.username}</span>
                                        {isSelected && <span className="selected-indicator">✓</span>}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '20px', padding: '15px 20px', borderTop: '1px solid #e2e8f0' }}>
                    <button className="btn-cancel" onClick={onClose} disabled={isLoading} style={{ padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', background: 'white', border: '1px solid #cbd5e1', color: '#475569', fontWeight: 600 }}>Cancel</button>
                    <button className="btn-save" onClick={handleCreateGroup} disabled={isLoading} style={{ padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', background: '#0284c7', color: 'white', border: 'none', fontWeight: 600 }}>
                        {isLoading ? 'Creating...' : 'Create Group'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateGroupModal;
