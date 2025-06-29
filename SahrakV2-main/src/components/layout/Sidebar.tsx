import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  FileText, 
  Pill, 
  Calendar, 
  Heart, 
  Activity, 
  MessageCircle, 
  AlertTriangle,
  Users,
  User,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Medications', href: '/medications', icon: Pill },
  { name: 'Appointments', href: '/appointments', icon: Calendar },
  { name: 'Mood Tracker', href: '/mood-tracker', icon: Heart },
  { name: 'Physical Wellness', href: '/progress', icon: Activity },
  { name: 'AI Assistant', href: '/ai-assistant', icon: MessageCircle },
  { name: 'SOS', href: '/sos', icon: AlertTriangle },
  { name: 'Caregivers', href: '/caregivers', icon: Users },
  { name: 'Profile', href: '/profile', icon: User },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  
  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Fixed position, always visible on desktop */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 h-full w-80 
        bg-[var(--sidebar-bg)] dark:bg-[var(--sidebar-bg)]
        transform transition-transform duration-300 ease-in-out flex-shrink-0
        lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[var(--sidebar-active)] dark:border-[var(--sidebar-active)]">
            <div className="flex items-center space-x-3">
              <Activity className="h-8 w-8 text-white" />
              <h2 className="text-xl font-bold text-white">
                Sahrak
              </h2>
            </div>
            
            {/* Close button for mobile */}
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-lg hover:bg-[var(--sidebar-hover)] text-white transition-colors"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation - Make scrollable if needed */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => window.innerWidth < 1024 && onClose()}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? 'bg-[var(--sidebar-active)] text-white shadow-lg'
                      : 'text-white hover:bg-[var(--sidebar-hover)] hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon 
                      size={20} 
                      className={`transition-colors ${
                        isActive 
                          ? 'text-white' 
                          : 'text-white/80 group-hover:text-white'
                      }`}
                    />
                    <span>{item.name}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
};