import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../api/user';
import { toast } from 'react-hot-toast';
import './Sidebar.css'; // Leverage existing modal styles

const SettingsModal = ({ isOpen, onClose }) => {
    const { user, setUser } = useAuth();
    const [username, setUsername] = useState(user?.username || '');
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(user?.avatar?.url || '');
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatarFile(file);
            // Create a temporary local URL for preview
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const formData = new FormData();
            if (username !== user.username) formData.append('username', username);
            if (avatarFile) formData.append('avatar', avatarFile);

            // If nothing actually changed, just close
            if (!formData.has('username') && !formData.has('avatar')) {
                setIsSaving(false);
                onClose();
                return;
            }

            const response = await updateProfile(formData);

            if (response.success) {
                toast.success("Profile updated successfully");

                // Update Local AuthContext State and LocalStorage with the new data
                const updatedUser = {
                    ...user,
                    username: response.data.username || username,
                    avatar: response.data.avatar || user.avatar
                };
                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));

                onClose();
            } else {
                toast.error(response.message || 'Failed to update profile');
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred during update');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                <div className="modal-header">
                    <h3>Profile Settings</h3>
                    <button className="icon-btn" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSave} className="modal-search-form" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        {/* Avatar Preview & Upload */}
                        <label htmlFor="avatar-upload" style={{ cursor: 'pointer', position: 'relative' }}>
                            <div
                                className="chat-avatar"
                                style={{
                                    width: '120px', height: '120px', fontSize: '3rem',
                                    backgroundImage: avatarPreview ? `url(${avatarPreview})` : 'none',
                                    backgroundSize: 'cover', backgroundPosition: 'center',
                                    border: '2px solid #e2e8f0', color: avatarPreview ? 'transparent' : 'white',
                                    margin: '0 auto'
                                }}
                            >
                                {!avatarPreview && (username ? username.charAt(0).toUpperCase() : 'U')}
                            </div>
                            <div style={{ position: 'absolute', bottom: '0px', right: '5px', background: '#0ea5e9', color: 'white', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid white', fontSize: '18px', cursor: 'pointer' }}>
                                +
                            </div>
                        </label>
                        <input
                            type="file"
                            id="avatar-upload"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleFileChange}
                        />
                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Click to change picture</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '500' }}>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="sidebar-input"
                            style={{ width: '100%' }}
                            required
                            minLength={3}
                        />
                    </div>

                    <button type="submit" className="btn-primary" disabled={isSaving} style={{ width: '100%', marginTop: '10px' }}>
                        {isSaving ? 'Saving Changes...' : 'Save Profile'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SettingsModal;
