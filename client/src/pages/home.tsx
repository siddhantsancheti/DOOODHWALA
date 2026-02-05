import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";
import { Users, Truck, Star, Package } from "lucide-react";
import { useLanguage, getTranslatedText } from "@/hooks/useLanguage";
// import logoImage from "@assets/Flat vector logo with milk jug icon_1756711717470.png";

export default function Home() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [, setLocation] = useLocation();

  const { data: customerProfile } = useQuery({
    queryKey: ["/api/customers/profile"],
    enabled: !!user && user.userType === 'customer',
  });

  const { data: milkmanProfile } = useQuery({
    queryKey: ["/api/milkmen/profile"],
    enabled: !!user && user.userType === 'milkman',
  });

  useEffect(() => {
    if (user && user.userType === "customer") {
      setLocation("/customer");
    } else if (user && user.userType === "milkman") {
      setLocation("/milkman");
    }
  }, [user, setLocation]);

  const handleCustomerSetup = () => {
    setLocation("/customer");
  };

  const handleMilkmanSetup = () => {
    setLocation("/milkman");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-8">
            <Package className="w-24 h-24 text-blue-600 mr-4" />
          </div>
          <h1 className="text-5xl font-bold text-foreground mb-6 tracking-tight">
            {getTranslatedText('Welcome to', language)} <span className="gradient-text">DOOODHWALA</span>, {user?.firstName || "there"}!
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {getTranslatedText('Choose how you\'d like to use DOOODHWALA today', language)}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          <Card className="modern-card cursor-pointer group" onClick={handleCustomerSetup}>
            <CardHeader className="text-center pb-6">
              <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-6 rounded-2xl w-28 h-28 flex items-center justify-center mx-auto mb-6 group-hover:shadow-xl group-hover:scale-105 transition-all duration-300">
                <Users className="h-16 w-16 text-white drop-shadow-lg" />
              </div>
              <CardTitle className="text-3xl font-semibold">{getTranslatedText('I\'m a Customer', language)}</CardTitle>
            </CardHeader>
            <CardContent className="text-center p-6">
              <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
                {getTranslatedText('Order fresh milk from local milkmen', language)}
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
              <Button className="w-full modern-button text-white font-semibold py-3 h-auto">
                Continue as Customer
              </Button>
            </CardContent>
          </Card>

          <Card className="modern-card cursor-pointer group" onClick={handleMilkmanSetup}>
            <CardHeader className="text-center pb-6">
              <div className="bg-gradient-to-r from-orange-500 via-red-500 to-yellow-500 p-6 rounded-2xl w-28 h-28 flex items-center justify-center mx-auto mb-6 group-hover:shadow-xl group-hover:scale-105 transition-all duration-300">
                <Truck className="h-16 w-16 text-white drop-shadow-lg" />
              </div>
              <CardTitle className="text-3xl font-semibold">{getTranslatedText('I\'m a Milkman', language)}</CardTitle>
            </CardHeader>
            <CardContent className="text-center p-6">
              <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
                {getTranslatedText('Sell fresh milk to customers', language)}
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
              <Button className="w-full modern-button text-white font-semibold py-3 h-auto">
                Continue as Milkman
              </Button>
            </CardContent>
          </Card>
        </div>


      </div>
    </div>
  );
}
