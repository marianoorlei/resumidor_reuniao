import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Brain, Calendar, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
    const { signOut } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const navItems = [
        { name: 'Minhas Reuniões', icon: Calendar, path: '/dashboard' },
        { name: 'Configurações', icon: SettingsIcon, path: '/configuracoes' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col fixed inset-y-0 shadow-sm z-10">
                <div className="flex items-center space-x-2 px-6 py-6">
                    <Brain className="w-8 h-8 text-gray-900" />
                    <span className="text-xl font-bold text-gray-900">AI Meet</span>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.path}
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
                        onClick={handleLogout}
                        className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors w-full"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Sair</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 ml-64 bg-white min-h-screen">
                <Outlet />
            </div>
        </div>
    );
}
