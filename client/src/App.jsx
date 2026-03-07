import { useState } from 'react'
import './App.css'
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom'
import Protectedlayout from './components/Protectedlayout'
import Dashboardlayout from './components/Dashboardlayout'
import Chatroom from './components/Chatroom'
import Authentication from './pages/Authentication'
import ErrorBoundary from './components/ErrorBoundary'

const router = createBrowserRouter(
  [
    {
      path: '/Authentication',
      element: <Authentication />,
      errorElement: <ErrorBoundary />
    },

    {
      path: '/',
      element: <Protectedlayout />,
      errorElement: <ErrorBoundary />,
      children: [
        {
          element: <Dashboardlayout />,
          children: [
            { index: true, element: <Chatroom /> },
            { path: 'Profile', element: <div>Profile Placeholder</div> },
            { path: 'Settings', element: <div>Settings Placeholder</div> }
          ]
        }
      ]
    }
  ]
)
import { Toaster } from 'react-hot-toast'

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <RouterProvider router={router} />
    </>
  )
}

export default App
