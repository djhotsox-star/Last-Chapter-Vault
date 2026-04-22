import React from 'react';
import {
  Shield, FileText, Users, ScrollText, Lock, LayoutDashboard, MessageSquareHeart,
  ChevronDown, LogOut, Settings, Bell, Menu, X, Home, ClipboardList,
  Scale, Key, Gavel, Crown, Mail, Camera, Trash2, FileLock
} from 'lucide-react';
import VaultIcon from '@/components/estate/vault/VaultIcon';
import DeleteAccountDialog from '@/components/estate/DeleteAccountDialog';

import type { AppView, UserRole, User } from '@/lib/estateStore';
import { useSubscription } from '@/contexts/SubscriptionContext';

const PRIVACY_POLICY_URL = 'https://effortless-kringle-efd718.netlify.app/privacy.html';

interface NavbarProps {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  isAuthenticated: boolean;
  user: User | null;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  onLoginClick: () => void;
  onLogout: () => void;
  notifications: number;
}

const BASE_NAV_ITEMS: { view: AppView; label: string; icon: React.ReactNode; roles?: UserRole[] }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { view: 'executor-tasks', label: 'My Duties', icon: <ClipboardList size={18} />, roles: ['executor'] },
  { view: 'documents', label: 'Documents', icon: <FileText size={18} /> },
  { view: 'photos', label: 'Photos', icon: <Camera size={18} /> },
  { view: 'roles', label: 'Roles & Access', icon: <Users size={18} /> },
  { view: 'will-builder', label: 'Will Builder', icon: <ScrollText size={18} /> },
  { view: 'password-vault', label: 'Passwords', icon: <VaultIcon size={18} /> },
  { view: 'legacy-messages', label: 'Messages', icon: <MessageSquareHeart size={18} /> },
  { view: 'attorney-review', label: 'Attorney Review', icon: <Gavel size={18} />, roles: ['owner'] },
  { view: 'legal-compliance', label: 'Legal', icon: <Scale size={18} /> },
  { view: 'death-verification', label: 'Trigger', icon: <Key size={18} />, roles: ['owner'] },
  { view: 'security', label: 'Security', icon: <Lock size={18} /> },
];

const Navbar: React.FC<NavbarProps> = ({
  currentView, setCurrentView, isAuthenticated, user, currentRole,
  setCurrentRole, onLoginClick, onLogout, notifications
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const { hasProAccess } = useSubscription();

  const openPrivacyPolicy = () => {
    window.open(PRIVACY_POLICY_URL, '_blank', 'noopener,noreferrer');
    setProfileOpen(false);
  };

  const NAV_ITEMS = BASE_NAV_ITEMS.filter(item => !item.roles || item.roles.includes(currentRole));

  return (
    <nav className="bg-[#0f1f3d] border-b border-[#1a365d]/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('home')}>
            <div className="w-9 h-9 bg-gradient-to-br from-[#d4af37] to-[#b8941f] rounded-lg flex items-center justify-center">
              <Shield size={20} className="text-[#0f1f3d]" />
            </div>
            <div>
              <span className="text-white font-serif text-lg font-bold tracking-wide">LegacyVault</span>
              <span className="text-[#d4af37] text-xs block -mt-1 tracking-widest uppercase">Estate Planning</span>
            </div>
          </div>

          {isAuthenticated && (
            <div className="hidden lg:flex items-center gap-1">
              {NAV_ITEMS.map(item => (
                <button
                  key={item.view}
                  onClick={() => setCurrentView(item.view)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    currentView === item.view
                      ? 'bg-[#d4af37]/20 text-[#d4af37]'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <>
                {hasProAccess ? (
                  <button
                    onClick={() => setCurrentView('subscription')}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#d4af37]/20 to-[#b8941f]/10 border border-[#d4af37]/30 rounded-lg text-[#d4af37] text-xs font-bold hover:bg-[#d4af37]/30 transition-all"
                  >
                    <Crown size={13} />
                    PRO
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentView('subscription')}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#d4af37] to-[#b8941f] rounded-lg text-[#0f1f3d] text-xs font-bold hover:shadow-lg hover:shadow-[#d4af37]/20 transition-all animate-pulse"
                    style={{ animationDuration: '3s' }}
                  >
                    <Crown size={13} />
                    Upgrade
                  </button>
                )}

                <div className="hidden md:flex items-center bg-[#1a365d]/50 rounded-lg p-0.5">
                  <button
                    onClick={() => setCurrentRole('owner')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      currentRole === 'owner' ? 'bg-[#d4af37] text-[#0f1f3d]' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Owner
                  </button>
                  <button
                    onClick={() => setCurrentRole('executor')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      currentRole === 'executor' ? 'bg-[#4a90d9] text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Executor
                  </button>
                </div>

                <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
                  <Bell size={20} />
                  {notifications > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {notifications}
                    </span>
                  )}
                </button>

                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#d4af37] to-[#b8941f] flex items-center justify-center text-[#0f1f3d] font-bold text-sm relative">
                      {user.name.split(' ').map(n => n[0]).join('')}
                      {hasProAccess && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#d4af37] rounded-full flex items-center justify-center border-2 border-[#0f1f3d]">
                          <Crown size={7} className="text-[#0f1f3d]" />
                        </div>
                      )}
                    </div>
                    <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
                  </button>
                  {profileOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                      <div className="absolute right-0 mt-2 w-64 bg-[#1a2744] border border-[#2d3f5e] rounded-xl shadow-2xl z-50 overflow-hidden">
                        <div className="p-4 border-b border-[#2d3f5e]">
                          <p className="text-white font-semibold text-sm">{user.name}</p>
                          <p className="text-gray-400 text-xs mt-0.5">{user.email}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              currentRole === 'owner' ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'bg-[#4a90d9]/20 text-[#4a90d9]'
                            }`}>
                              {currentRole}
                            </span>
                            {hasProAccess && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#d4af37]/20 text-[#d4af37] flex items-center gap-1">
                                <Crown size={8} /> PRO
                              </span>
                            )}
                            {user.twoFactorEnabled && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-400">
                                2FA Active
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="p-2">
                          <button
                            onClick={() => { setCurrentView('subscription'); setProfileOpen(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
                          >
                            <Crown size={16} className="text-[#d4af37]" />
                            {hasProAccess ? 'Manage Subscription' : 'Upgrade to Pro'}
                          </button>
                          <button
                            onClick={() => { setCurrentView('security'); setProfileOpen(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
                          >
                            <Settings size={16} />
                            Security Settings
                          </button>
                          <button
                            onClick={() => { setCurrentView('email-preferences'); setProfileOpen(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
                          >
                            <Mail size={16} />
                            Email Notifications
                          </button>
                          <button
                            onClick={openPrivacyPolicy}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
                          >
                            <FileLock size={16} />
                            Privacy Policy
                          </button>

                          <div className="my-2 border-t border-[#2d3f5e]" />

                          <button
                            onClick={() => { onLogout(); setProfileOpen(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
                          >
                            <LogOut size={16} />
                            Sign Out
                          </button>
                          <button
                            onClick={() => { setProfileOpen(false); setShowDeleteDialog(true); }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                            Delete Account
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <DeleteAccountDialog
                  open={showDeleteDialog}
                  onClose={() => setShowDeleteDialog(false)}
                  onDeleted={() => {
                    setShowDeleteDialog(false);
                    window.location.href = '/';
                  }}
                  userEmail={user?.email}
                />

                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 text-gray-400 hover:text-white"
                >
                  {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={onLoginClick}
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={onLoginClick}
                  className="px-5 py-2 bg-gradient-to-r from-[#d4af37] to-[#b8941f] text-[#0f1f3d] text-sm font-bold rounded-lg hover:shadow-lg hover:shadow-[#d4af37]/20 transition-all"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {mobileMenuOpen && isAuthenticated && (
        <div className="lg:hidden border-t border-[#1a365d]/50 bg-[#0f1f3d] pb-4">
          <div className="px-4 pt-3 space-y-1">
            {!hasProAccess && (
              <button
                onClick={() => { setCurrentView('subscription'); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 mb-2 rounded-lg text-sm font-bold bg-gradient-to-r from-[#d4af37]/20 to-[#b8941f]/10 border border-[#d4af37]/30 text-[#d4af37] transition-all"
              >
                <Crown size={18} />
                Upgrade to Pro
              </button>
            )}
            {hasProAccess && (
              <button
                onClick={() => { setCurrentView('subscription'); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 mb-2 rounded-lg text-sm font-medium text-[#d4af37] bg-[#d4af37]/10 border border-[#d4af37]/20 transition-all"
              >
                <Crown size={18} />
                Pro Plan Active
              </button>
            )}

            <div className="flex items-center bg-[#1a365d]/50 rounded-lg p-0.5 mb-3 md:hidden">
              <button
                onClick={() => setCurrentRole('owner')}
                className={`flex-1 px-3 py-2 rounded-md text-xs font-semibold transition-all ${
                  currentRole === 'owner' ? 'bg-[#d4af37] text-[#0f1f3d]' : 'text-gray-400'
                }`}
              >
                Owner Mode
              </button>
              <button
                onClick={() => setCurrentRole('executor')}
                className={`flex-1 px-3 py-2 rounded-md text-xs font-semibold transition-all ${
                  currentRole === 'executor' ? 'bg-[#4a90d9] text-white' : 'text-gray-400'
                }`}
              >
                Executor Mode
              </button>
            </div>
            {NAV_ITEMS.map(item => (
              <button
                key={item.view}
                onClick={() => { setCurrentView(item.view); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  currentView === item.view
                    ? 'bg-[#d4af37]/20 text-[#d4af37]'
                    : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;