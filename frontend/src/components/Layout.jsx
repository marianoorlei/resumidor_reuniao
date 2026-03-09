import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Brain, Calendar, Settings as SettingsIcon, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
    const { signOut } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const navItems = [
        { name: 'Minhas Reuniões', icon: Calendar, path: '/dashboard' },
        { name: 'Configurações', icon: SettingsIcon, path: '/configuracoes' },
    ];

    const closeSidebar = () => setSidebarOpen(false);

    return (
        <div className="min-h-screen bg-gray-50 flex overflow-x-hidden w-full">
            {/* Mobile Top Bar */}
            <div className="md:hidden fixed top-0 left-0 right-0 bg-gray-50 border-b border-gray-200 flex items-center px-4 py-3 z-30 shadow-sm">
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="p-1.5 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                    <Menu className="w-6 h-6" />
                </button>
                <div className="flex items-center space-x-2 ml-3">
                    <Brain className="w-7 h-7 text-gray-900" />
                    <span className="text-lg font-bold text-gray-900">AI Meet</span>
                </div>
            </div>

            {/* Mobile Backdrop */}
            {sidebarOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/40 z-40"
                    onClick={closeSidebar}
                />
            )}

            {/* Sidebar */}
            <div
                className={`
                    fixed inset-y-0 left-0 w-64 bg-gray-50 border-r border-gray-200 flex flex-col shadow-sm z-50
                    transition-transform duration-300 ease-in-out
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    md:translate-x-0
                `}
            >
                <div className="flex items-center justify-between px-6 py-6">
                    <div className="flex items-center space-x-2">
                        <Brain className="w-8 h-8 text-gray-900" />
                        <span className="text-xl font-bold text-gray-900">AI Meet</span>
                    </div>
                    <button
                        onClick={closeSidebar}
                        className="md:hidden p-1 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.path}
                            onClick={closeSidebar}
                            className={({ isActive }) =>
                                `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                    ? 'bg-blue-100/50 text-blue-700'
                                    : 'text-gray-700 hover:bg-gray-100'
                                }`
                            }
                        >
                            <item.icon className="w-5 h-5" />
                            <span>{item.name}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 mb-4">
                    <button
                        onClick={() => { closeSidebar(); handleLogout(); }}
                        className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors w-full"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Sair</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 md:ml-64 bg-white min-h-screen pt-14 md:pt-0 w-full min-w-0 overflow-x-hidden">
                <Outlet />
            </div>
        </div>
    );
}
