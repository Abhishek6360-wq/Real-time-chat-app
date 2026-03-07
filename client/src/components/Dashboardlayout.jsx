import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Dashboardlayout = () => {
  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
        <Outlet />
      </div>
    </div>
  );
};

export default Dashboardlayout