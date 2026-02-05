import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  Home,
  ShoppingCart,
  MapPin,
  Receipt,
  User,
  Menu,
  X,
  Users
} from "lucide-react";
import { useLanguage, getTranslatedText } from '@/hooks/useLanguage';

export function MobileNav() {
  const [location, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { language } = useLanguage();

  const navigationItems = [
    { icon: Home, label: getTranslatedText("Home", language), path: location.includes("/milkman") ? "/milkman" : "/customer" },
    // { icon: ShoppingCart, label: getTranslatedText("Quick Order", language), path: "/quick-order" },
    { icon: MapPin, label: getTranslatedText("Track", language), path: "/track-delivery" },
    { icon: Receipt, label: getTranslatedText("Orders", language), path: "/view-orders" },
    { icon: User, label: getTranslatedText("Profile", language), path: "/profile" },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-50">
        <div className="flex items-center justify-around py-2">
          {navigationItems.map((item, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              onClick={() => setLocation(item.path)}
              className={`mobile-nav-item-enhanced flex flex-col items-center gap-1 p-2 min-h-12 ${location === item.path
                  ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 active"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Button>
          ))}
        </div>
      </div>


    </>
  );
}