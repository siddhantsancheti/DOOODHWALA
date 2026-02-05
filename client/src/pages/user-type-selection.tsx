import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Users, Truck, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Navbar } from "@/components/navbar";
// Note: Using direct text as getTranslatedText may not be available
// import { getTranslatedText } from "@/lib/language";

import logoImage from "@/assets/logo.png";

export default function UserTypeSelection() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSelecting, setIsSelecting] = useState(false);
  const language = 'en'; // Default language

  const handleCustomerSetup = async () => {
    if (isSelecting) return;
    setIsSelecting(true);

    try {
      console.log('Updating user type to: customer');

      const res = await apiRequest('/api/auth/user-type', 'PUT', { userType: 'customer' });
      const response = await res.json();

      if (response.success) {
        // Invalidate auth user query to refresh state immediately
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

        toast({
          title: "User type updated!",
          description: "You've selected customer. Let's complete your profile."
        });

        // Navigate to customer profile setup
        setLocation('/profile-setup?type=customer');
      } else {
        throw new Error(response.message || 'Failed to update user type');
      }
    } catch (error) {
      console.error('User type selection error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user type. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSelecting(false);
    }
  };

  const handleMilkmanSetup = async () => {
    if (isSelecting) return;
    setIsSelecting(true);

    try {
      console.log('Updating user type to: milkman');

      const res = await apiRequest('/api/auth/user-type', 'PUT', { userType: 'milkman' });
      const response = await res.json();

      if (response.success) {
        // Invalidate auth user query to refresh state immediately
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

        toast({
          title: "User type updated!",
          description: "You've selected milkman. Let's complete your profile."
        });

        // Navigate to milkman dashboard for complete profile setup
        setLocation('/milkman-profile-setup');
      } else {
        throw new Error(response.message || 'Failed to update user type');
      }
    } catch (error) {
      console.error('User type selection error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user type. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSelecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-16">
        {/* Logo Badge */}
        <div className="text-center mb-16">
          <div className="w-40 h-40 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-8">
            <img src={logoImage} alt="DOOODHWALA" className="w-28 h-28 object-contain" />
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="text-foreground">Welcome to </span>
            <span className="bg-gradient-to-r from-blue-600 via-teal-500 to-green-500 bg-clip-text text-transparent">
              DOOODHWALA
            </span>
            <span className="text-foreground">, there!</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Choose how you'd like to use DOOODHWALA today
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          <Card className="modern-card cursor-pointer group" onClick={handleCustomerSetup}>
            <CardHeader className="text-center pb-6">
              <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-6 rounded-2xl w-28 h-28 flex items-center justify-center mx-auto mb-6 group-hover:shadow-xl group-hover:scale-105 transition-all duration-300">
                <Users className="h-16 w-16 text-white drop-shadow-lg" />
              </div>
              <CardTitle className="text-3xl font-semibold">I'm a Customer</CardTitle>
            </CardHeader>
            <CardContent className="text-center p-6">
              <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
                Order fresh milk from local milkmen
              </p>
              <ul className="text-muted-foreground space-y-3 mb-8 text-left">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-brand-primary rounded-full mr-3"></span>
                  Browse available milkmen in your area
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-brand-primary rounded-full mr-3"></span>
                  Place daily orders with ease
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-brand-primary rounded-full mr-3"></span>
                  Track deliveries in real-time
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-brand-primary rounded-full mr-3"></span>
                  Monthly billing and payment
                </li>
              </ul>
              <Button className="w-full modern-button text-white font-semibold py-3 h-auto" disabled={isSelecting}>
                Continue as Customer
              </Button>
            </CardContent>
          </Card>

          <Card className="modern-card cursor-pointer group" onClick={handleMilkmanSetup}>
            <CardHeader className="text-center pb-6">
              <div className="bg-gradient-to-r from-orange-500 via-red-500 to-yellow-500 p-6 rounded-2xl w-28 h-28 flex items-center justify-center mx-auto mb-6 group-hover:shadow-xl group-hover:scale-105 transition-all duration-300">
                <Truck className="h-16 w-16 text-white drop-shadow-lg" />
              </div>
              <CardTitle className="text-3xl font-semibold">I'm a Milkman</CardTitle>
            </CardHeader>
            <CardContent className="text-center p-6">
              <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
                Sell fresh milk to customers
              </p>
              <ul className="text-muted-foreground space-y-3 mb-8 text-left">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-brand-secondary rounded-full mr-3"></span>
                  Manage daily delivery routes
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-brand-secondary rounded-full mr-3"></span>
                  Track orders and customer requests
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-brand-secondary rounded-full mr-3"></span>
                  Update availability status
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-brand-secondary rounded-full mr-3"></span>
                  Build customer relationships
                </li>
              </ul>
              <Button className="w-full modern-button text-white font-semibold py-3 h-auto" disabled={isSelecting}>
                Continue as Milkman
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}