import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useChat } from '../context/ChatContext';

const Dashboardlayout = () => {
  const { activeChat, setActiveChat } = useChat();

  // Intercept the browser/hardware "Back" button on mobile
  useEffect(() => {
    // Only intercept if we are actively viewing a chat on a mobile-sized screen
    if (activeChat && window.innerWidth <= 768) {
      window.history.pushState(null, '', window.location.href);

      const handlePopState = () => {
        // When the user hits the back button, clear the active chat instead of leaving the page
        setActiveChat(null);
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [activeChat, setActiveChat]);

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