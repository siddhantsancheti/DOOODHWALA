import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  CreditCard,
  Star,
  Smartphone,
  Clock,
  Shield,
  Truck,
  Zap,
  Users,
} from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-surface border-b sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">🥛</span>
              </div>
              <span className="text-2xl font-bold gradient-text">DOOODHWALA</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                className="text-brand-primary hover:bg-surface-secondary rounded-lg"
                onClick={() => (window.location.href = "/api/login")}
              >
                Login
              </Button>
              <Button
                className="modern-button px-6 py-2"
                onClick={() => (window.location.href = "/api/login")}
              >
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-surface to-surface-secondary py-24 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <span className="text-white text-4xl">🥛</span>
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 tracking-tight">
            Fresh Milk, <span className="gradient-text">Daily Delivered</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-4xl mx-auto leading-relaxed">
            Connect with trusted local milkmen for fresh dairy products delivered right to your doorstep.
            Track deliveries, manage orders, and enjoy the convenience of daily milk delivery.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button
              size="lg"
              className="modern-button text-lg px-10 py-6 shadow-lg"
              onClick={() => (window.location.href = "/api/login")}
            >
              <Users className="mr-3 h-6 w-6" />
              Order as Customer
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-brand-secondary text-white hover:bg-brand-secondary/90 border-brand-secondary text-lg px-10 py-6 shadow-lg rounded-lg"
              onClick={() => (window.location.href = "/api/login")}
            >
              <Truck className="mr-3 h-6 w-6" />
              Join as Milkman
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 tracking-tight">
              Why Choose Doodhwala?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need for seamless dairy delivery experience
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="modern-card p-8 group">
              <CardContent className="p-0">
                <div className="bg-gradient-to-r from-brand-primary to-info p-4 rounded-2xl w-16 h-16 flex items-center justify-center mb-6 group-hover:shadow-lg transition-all">
                  <MapPin className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-foreground mb-4">Live Tracking</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Track your milkman in real-time and know exactly when your fresh milk will arrive at your doorstep.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-8">
                <div className="dairy-green p-4 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                  <CreditCard className="h-8 w-8 text-secondary-green" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Monthly Billing</h3>
                <p className="text-gray-600">
                  Convenient 30-day billing cycles with secure payment options. No daily payment hassles.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-8">
                <div className="bg-orange-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                  <Star className="h-8 w-8 text-accent-orange" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Your Doodhwala</h3>
                <p className="text-gray-600">
                  Assign a dedicated milkman and enjoy one-click daily ordering with personalized service.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-8">
                <div className="dairy-blue p-4 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                  <Smartphone className="h-8 w-8 text-primary-blue" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Mobile First</h3>
                <p className="text-gray-600">
                  Optimized for mobile devices with intuitive interface for both customers and milkmen.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-8">
                <div className="dairy-green p-4 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                  <Clock className="h-8 w-8 text-secondary-green" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Flexible Scheduling</h3>
                <p className="text-gray-600">
                  Set your preferred delivery times and manage your daily milk requirements effortlessly.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-8">
                <div className="bg-orange-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                  <Shield className="h-8 w-8 text-accent-orange" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Quality Assured</h3>
                <p className="text-gray-600">
                  All our milkmen are verified and committed to delivering fresh, quality dairy products.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-gradient-to-r from-primary-blue to-blue-600 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Start Your Dairy Journey?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Join thousands of satisfied customers enjoying fresh milk delivery every day
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="bg-white text-primary-blue hover:bg-gray-100 px-8 py-4 text-lg transform hover:scale-105 transition-all"
            onClick={() => (window.location.href = "/api/login")}
          >
            Get Started Today
          </Button>
        </div>
      </div>
    </div>
  );
}
