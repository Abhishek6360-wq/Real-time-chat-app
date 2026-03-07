import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useChat } from '../context/ChatContext';

const Dashboardlayout = () => {
  const { activeChat } = useChat();

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar Area: Hidden on mobile if a chat is active */}
      <div className={`sidebar-wrapper ${activeChat ? 'mobile-hidden' : 'mobile-full-width'}`}>
        <Sidebar />
      </div>

      {/* Chat Area: Hidden on mobile if NO chat is active */}
      <div
        className={`chat-wrapper ${!activeChat ? 'mobile-hidden' : 'mobile-full-width'}`}
        style={{ flex: 1, height: '100%', overflow: 'hidden' }}
      >
        <Outlet />
      </div>
    </div>
  );
};

export default Dashboardlayout