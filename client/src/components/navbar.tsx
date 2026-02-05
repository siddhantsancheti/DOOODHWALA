import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Bell, Settings, User, Package, Moon, Sun, LogOut, Languages, Check, Users } from "lucide-react";
import logoImage from "@/assets/logo.png";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/useWebSocket";
import { queryClient } from "@/lib/queryClient";

// Translation function
const getTranslatedText = (text: string, language: string) => {
  const translations: Record<string, Record<string, string>> = {
    'en': {
      'Settings': 'Settings',
      'Dark Mode': 'Dark Mode',
      'Light Mode': 'Light Mode',
      'Language': 'Language',
      'Select Language': 'Select Language',
      'Test Language Features': 'Test Language Features',
      'Profile': 'Profile',
      'Orders': 'Orders',
      'Logout': 'Logout',
      'Notifications': 'Notifications',
      'Mark all as read': 'Mark all as read',
      'View all notifications': 'View all notifications',
      'No notifications yet': 'No notifications yet',
      'You\'ll see updates about orders, messages, and more here': 'You\'ll see updates about orders, messages, and more here'
    },
    'hi': {
      'Settings': 'सेटिंग्स',
      'Dark Mode': 'डार्क मोड',
      'Light Mode': 'लाइट मोड',
      'Language': 'भाषा',
      'Select Language': 'भाषा चुनें',
      'Test Language Features': 'भाषा सुविधाओं का परीक्षण करें',
      'Profile': 'प्रोफ़ाइल',
      'Orders': 'ऑर्डर',
      'Logout': 'लॉगआउट',
      'Notifications': 'सूचनाएं',
      'Mark all as read': 'सभी को पढ़ा हुआ चिह्नित करें',
      'View all notifications': 'सभी सूचनाएं देखें',
      'No notifications yet': 'अभी तक कोई सूचना नहीं',
      'You\'ll see updates about orders, messages, and more here': 'आपको यहाँ ऑर्डर, संदेश और अन्य अपडेट दिखाई देंगे'
    },
    'mr': {
      'Settings': 'सेटिंग्ज',
      'Dark Mode': 'डार्क मोड',
      'Light Mode': 'लाइट मोड',
      'Language': 'भाषा',
      'Select Language': 'भाषा निवडा',
      'Test Language Features': 'भाषा वैशिष्ट्यांची चाचणी करा',
      'Profile': 'प्रोफाइल',
      'Orders': 'ऑर्डर',
      'Logout': 'लॉगआउट',
      'Notifications': 'सूचना',
      'Mark all as read': 'सर्व वाचले म्हणून चिन्हांकित करा',
      'View all notifications': 'सर्व सूचना पहा',
      'No notifications yet': 'अजून कोणत्या सूचना नाहीत',
      'You\'ll see updates about orders, messages, and more here': 'तुम्हाला येथे ऑर्डर, संदेश आणि इतर अपडेट दिसतील'
    }
  };

  return translations[language]?.[text] || text;
};
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from '@/lib/queryClient';

export function Navbar() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    // Apply theme on load
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    return savedTheme;
  });
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'en');

  // Listen for language changes from other components
  useEffect(() => {
    const handleLanguageChange = (event: CustomEvent) => {
      setLanguage(event.detail);
    };

    const handleStorageChange = () => {
      const newLanguage = localStorage.getItem('language') || 'en';
      setLanguage(newLanguage);
    };

    window.addEventListener('languageChanged', handleLanguageChange as EventListener);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);

  // Fetch notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications'],
    enabled: isAuthenticated && !!user,
  });

  // Real-time notification updates
  const { addMessageHandler, removeMessageHandler, isConnected } = useWebSocket();

  useEffect(() => {
    if (!isConnected || !user) return;

    const handler = (data: any) => {
      if (data.type === 'new_notification') {
        // Check if notification is for this user
        if (data.userId === (user as any).id) { // This user.id is checked against notification userId
          queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
        }
      }
    };

    addMessageHandler('navbar-notifications', handler);
    return () => removeMessageHandler('navbar-notifications');
  }, [isConnected, user, addMessageHandler, removeMessageHandler]);

  // Count unread notifications
  const unreadCount = Array.isArray(notifications) ? notifications.filter((n: any) => !n.isRead).length : 0;

  // Theme toggle function
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  // Language selection
  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी' }
  ];

  const changeLanguage = (langCode: string) => {
    setLanguage(langCode);
    localStorage.setItem('language', langCode);
    setLanguageMenuOpen(false);

    // Trigger a custom event for other components to listen to language changes
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: langCode }));

    // Force re-render of all components by updating the document attribute
    document.documentElement.setAttribute('data-language', langCode);

    // Trigger a storage event to update all components that listen to language changes
    window.dispatchEvent(new Event('storage'));

    console.log(`Language changed to: ${langCode}`);
  };

  const isActive = (path: string) => location === path;

  // Hide navigation items during login AND on profile setup pages AND dashboards
  const isLoginPage = isLoading || !isAuthenticated;
  const isProfileSetupPage = location === "/customer" || location === "/milkman" || location === "/yd";
  const isHomePage = location === "/" && isAuthenticated && !isLoading;
  const shouldHideNavItems = isLoginPage || isProfileSetupPage;
  const shouldHideProfile = isLoginPage || isProfileSetupPage;

  return (
    <nav className="bg-white/95 dark:bg-gray-900/95 border-b border-gray-200 dark:border-gray-700 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            <img src={logoImage} alt="DOOODHWALA Logo" className="w-8 h-8 object-contain" />
            <span className="text-2xl md:text-3xl font-bold gradient-text whitespace-nowrap">DOOODHWALA</span>
          </div>
          {!shouldHideNavItems && (
            <div className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => setLocation("/")}
                className={`nav-btn transition-colors ${isActive("/")
                  ? "text-blue-600 dark:text-blue-400 font-semibold"
                  : "text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                  }`}
              >
                Home
              </button>



            </div>
          )}
          <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-5">
            {user && (
              <div className="hidden lg:flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">
                <span className="text-base font-medium text-gray-900 dark:text-gray-100">
                  Hi, {String((user as any)?.username || (user as any)?.firstName || "User")}!
                </span>
              </div>
            )}

            {/* Notification Bell */}
            {isAuthenticated && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors relative"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs bg-red-500 dark:bg-red-600 text-white border-2 border-white dark:border-gray-900 animate-pulse"
                      >
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg">
                  <DropdownMenuLabel className="text-base font-semibold text-gray-900 dark:text-gray-100 px-4 py-3">
                    {getTranslatedText('Notifications', language)} {unreadCount > 0 && `(${unreadCount})`}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {!Array.isArray(notifications) || notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">{getTranslatedText('No notifications yet', language)}</p>
                      <p className="text-xs">{getTranslatedText('You\'ll see updates about orders, messages, and more here', language)}</p>
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto">
                      {Array.isArray(notifications) && notifications.slice(0, 10).map((notification: any) => (
                        <DropdownMenuItem
                          key={notification.id}
                          className={`flex flex-col items-start p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${!notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                          onClick={async (e) => {
                            // Prevent default to allow async operation? No, we want it to close?
                            // Actually, updating read status might unmount the item if list changes?
                            // Let's keep it simple.
                            try {
                              if (!notification.isRead) {
                                const token = localStorage.getItem('token');
                                const response = await fetch(`/api/notifications/${notification.id}/read`, {
                                  method: 'PATCH',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                  }
                                });
                                if (response.ok) {
                                  window.location.reload();
                                }
                              }
                            } catch (error) {
                              console.error('Error marking notification as read:', error);
                            }
                          }}
                        >
                          <div className="w-full">
                            <div className="flex items-start justify-between w-full">
                              <p className="text-base font-medium text-gray-900 dark:text-gray-100 mb-1">
                                {notification.title}
                              </p>
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full flex-shrink-0 mt-1" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                              {notification.message}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(notification.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </DropdownMenuItem>
                      ))}

                      {Array.isArray(notifications) && notifications.length > 10 && (
                        <DropdownMenuItem className="text-center text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                          {getTranslatedText('View all notifications', language)}
                        </DropdownMenuItem>
                      )}

                      {unreadCount > 0 && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-center text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                            onClick={async (e) => {
                              try {
                                const response = await apiRequest('/api/notifications/mark-all-read', 'PATCH');
                                if (response.ok) {
                                  window.location.reload();
                                }
                              } catch (error) {
                                console.error('Error marking all notifications as read:', error);
                              }
                            }}
                          >
                            {getTranslatedText('Mark all as read', language)}
                          </DropdownMenuItem>
                        </>
                      )}
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {/* Settings Dropdown */}
            {isAuthenticated && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 px-2 sm:px-3 py-1.5 sm:py-2 font-medium transition-colors"
                  >
                    <Settings className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                    <span className="text-xs sm:text-sm font-semibold hidden sm:inline">{getTranslatedText('Settings', language)}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg">
                  <DropdownMenuLabel className="text-base font-semibold text-gray-900 dark:text-gray-100 px-4 py-3">
                    {getTranslatedText('Settings', language)}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {/* Theme Toggle */}
                  <DropdownMenuItem
                    onClick={(e) => {
                      toggleTheme();
                    }}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                  >
                    {theme === 'light' ? (
                      <Moon className="h-4 w-4 mr-2" />
                    ) : (
                      <Sun className="h-4 w-4 mr-2" />
                    )}
                    {theme === 'light' ? getTranslatedText('Dark Mode', language) : getTranslatedText('Light Mode', language)}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {/* Language Selection */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <DropdownMenuItem
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                        onSelect={(e) => e.preventDefault()}
                      >
                        <Languages className="h-4 w-4 mr-2" />
                        {getTranslatedText('Language', language)}
                        <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                          {languages.find(l => l.code === language)?.nativeName}
                        </span>
                      </DropdownMenuItem>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="bottom" align="end" className="w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg max-h-64 overflow-y-auto">
                      <DropdownMenuLabel className="text-gray-900 dark:text-gray-100 px-4 py-3">{getTranslatedText('Select Language', language)}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {languages.map((lang) => (
                        <DropdownMenuItem
                          key={lang.code}
                          onClick={() => changeLanguage(lang.code)}
                          className="cursor-pointer flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{lang.name}</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">{lang.nativeName}</span>
                          </div>
                          {language === lang.code && (
                            <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenuSeparator />


                  {/* Profile */}
                  <DropdownMenuItem
                    onClick={() => {
                      setLocation("/profile");
                    }}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                  >
                    <User className="h-4 w-4 mr-2" />
                    {getTranslatedText('Profile', language)}
                  </DropdownMenuItem>

                  {/* Orders */}
                  <DropdownMenuItem
                    onClick={() => {
                      // Navigate to orders page - this can be customized based on user type
                      if ((user as any)?.userType === 'customer') {
                        window.open('/customer-dashboard', '_blank', 'width=1200,height=800');
                      } else if ((user as any)?.userType === 'milkman') {
                        window.open('/milkman-dashboard', '_blank', 'width=1200,height=800');
                      }
                    }}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    {getTranslatedText('Orders', language)}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {/* Logout */}
                  <DropdownMenuItem
                    onClick={() => {
                      logout();
                      setLocation("/");
                    }}
                    className="cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {getTranslatedText('Logout', language)}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
