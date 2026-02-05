import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";
import { MobileNav } from "@/components/mobile-nav";
import { useLocation } from "wouter";
import { 
  ShoppingCart, 
  MapPin, 
  CreditCard, 
  Bell, 
  Star, 
  Clock, 
  Users, 
  TrendingUp, 
  Shield, 
  Smartphone,
  Route,
  BarChart3,
  Calendar,
  MessageSquare,
  IndianRupee,
  Truck,
  UserCheck,
  MessageCircle,
  Receipt,
  CheckCircle,
  DollarSign,
  Calculator
} from "lucide-react";

export default function Features() {
  const [, setLocation] = useLocation();

  const customerFeatures = [
    {
      icon: <ShoppingCart className="h-8 w-8 text-primary-blue" />,
      title: "Easy Ordering",
      description: "Place daily milk orders with just a few clicks. Set up regular deliveries or order on-demand.",
      details: ["Quick order placement", "Quantity selection", "Special instructions", "Flexible scheduling"]
    },
    {
      icon: <MapPin className="h-8 w-8 text-primary-blue" />,
      title: "Real-time Tracking", 
      description: "Track your milkman's location and get live updates on delivery status.",
      details: ["Live GPS tracking", "Delivery notifications", "ETA updates", "Route optimization"]
    },
    {
      icon: <Users className="h-8 w-8 text-primary-blue" />,
      title: "Find Local Milkmen",
      description: "Browse and connect with verified milkmen in your area with ratings and reviews.",
      details: ["Location-based search", "Verified profiles", "Customer reviews", "Price comparison"]
    },
    {
      icon: <CreditCard className="h-8 w-8 text-primary-blue" />,
      title: "Monthly Billing",
      description: "Convenient monthly billing with detailed breakdowns and multiple payment options.",
      details: ["Automated billing", "Payment history", "Invoice downloads", "Multiple payment methods"]
    },
    {
      icon: <Bell className="h-8 w-8 text-primary-blue" />,
      title: "Smart Notifications",
      description: "Get notified about deliveries, billing, and important updates.",
      details: ["Delivery alerts", "Payment reminders", "Order confirmations", "Custom preferences"]
    },
    {
      icon: <Star className="h-8 w-8 text-primary-blue" />,
      title: "Review & Rating",
      description: "Rate your milkman and leave reviews to help other customers make informed choices.",
      details: ["5-star rating system", "Detailed reviews", "Photo uploads", "Community feedback"]
    }
  ];

  const milkmanFeatures = [
    {
      icon: <Route className="h-8 w-8 text-secondary-green" />,
      title: "Route Management",
      description: "Optimize your delivery routes and manage customer locations efficiently.",
      details: ["Smart route planning", "GPS navigation", "Customer mapping", "Time optimization"]
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-secondary-green" />,
      title: "Business Analytics",
      description: "Track your business performance with detailed analytics and insights.",
      details: ["Revenue tracking", "Customer analytics", "Delivery metrics", "Growth insights"]
    },
    {
      icon: <Calendar className="h-8 w-8 text-secondary-green" />,
      title: "Order Management",
      description: "Manage all customer orders, schedules, and delivery preferences in one place.",
      details: ["Order dashboard", "Schedule management", "Customer preferences", "Bulk updates"]
    },
    {
      icon: <IndianRupee className="h-8 w-8 text-secondary-green" />,
      title: "Custom Pricing",
      description: "Set individual pricing for different customers based on quantity and preferences.",
      details: ["Per-customer pricing", "Bulk discounts", "Seasonal rates", "Special offers"]
    },
    {
      icon: <UserCheck className="h-8 w-8 text-secondary-green" />,
      title: "Customer Relationships",
      description: "Build and maintain strong relationships with your customer base.",
      details: ["Customer profiles", "Order history", "Communication tools", "Feedback management"]
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-secondary-green" />,
      title: "Growth Tools",
      description: "Expand your business with tools to attract and retain more customers.",
      details: ["Marketing insights", "Customer acquisition", "Retention strategies", "Performance metrics"]
    }
  ];

  const platformFeatures = [
    {
      icon: <Shield className="h-8 w-8 text-gray-600" />,
      title: "Secure Platform",
      description: "Advanced security measures to protect your data and transactions.",
      details: ["Data encryption", "Secure payments", "Privacy protection", "Regular security updates"]
    },
    {
      icon: <Smartphone className="h-8 w-8 text-gray-600" />,
      title: "Mobile Optimized",
      description: "Fully responsive design that works perfectly on all devices.",
      details: ["Mobile-first design", "Touch-friendly interface", "Offline capabilities", "Fast loading"]
    },
    {
      icon: <Clock className="h-8 w-8 text-gray-600" />,
      title: "24/7 Availability",
      description: "Access the platform anytime, anywhere with reliable uptime.",
      details: ["Always accessible", "Cloud-based", "Automatic backups", "99.9% uptime"]
    },
    {
      icon: <MessageSquare className="h-8 w-8 text-gray-600" />,
      title: "Customer Support",
      description: "Dedicated support team to help you with any questions or issues.",
      details: ["Live chat support", "Help documentation", "Video tutorials", "Community forum"]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <Navbar />
      <MobileNav />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Complete Dairy Delivery Platform
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Discover all 22 powerful features that make DOOODHWALA the perfect solution 
            for customers seeking fresh milk delivery and milkmen growing their business.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => setLocation("/")}
              className="bg-primary-blue hover:bg-blue-600 px-8 py-3"
            >
              Get Started
            </Button>
            <Button 
              onClick={() => setLocation("/profile")}
              variant="outline"
              className="border-primary-blue text-primary-blue hover:bg-blue-50 px-8 py-3"
            >
              View Profile
            </Button>
          </div>
        </div>

        {/* All Features Overview */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">All Platform Features at a Glance</h2>
            <p className="text-lg text-gray-600">22 comprehensive features across customer, milkman, and admin experiences</p>
          </div>
          
          <div className="feature-grid-mobile mb-8 sm:mb-12">
            <div className="feature-card-mobile text-center">
              <ShoppingCart className="h-6 w-6 mx-auto mb-2 text-blue-600" />
              <h4 className="font-medium text-sm">Quick Order</h4>
            </div>
            <div className="feature-card-mobile text-center">
              <MapPin className="h-6 w-6 mx-auto mb-2 text-green-600" />
              <h4 className="font-medium text-sm">Real-time Tracking</h4>
            </div>
            <div className="feature-card-mobile text-center">
              <MessageCircle className="h-6 w-6 mx-auto mb-2 text-purple-600" />
              <h4 className="font-medium text-sm">YD Chat</h4>
            </div>
            <div className="feature-card-mobile text-center">
              <Users className="h-6 w-6 mx-auto mb-2 text-indigo-600" />
              <h4 className="font-medium text-sm">Your Doodhwala</h4>
            </div>
            <div className="feature-card-mobile text-center">
              <Receipt className="h-6 w-6 mx-auto mb-2 text-orange-600" />
              <h4 className="font-medium text-sm">Order History</h4>
            </div>
            <div className="feature-card-mobile text-center">
              <Star className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
              <h4 className="font-medium text-sm">Service Requests</h4>
            </div>
            <div className="feature-card-mobile text-center">
              <DollarSign className="h-6 w-6 mx-auto mb-2 text-emerald-600" />
              <h4 className="font-medium text-sm">Stripe Payments</h4>
            </div>
            <div className="feature-card-mobile text-center">
              <Calculator className="h-6 w-6 mx-auto mb-2 text-pink-600" />
              <h4 className="font-medium text-sm">Monthly Billing</h4>
            </div>
            <div className="feature-card-mobile text-center">
              <CheckCircle className="h-6 w-6 mx-auto mb-2 text-teal-600" />
              <h4 className="font-medium text-sm">Checkout System</h4>
            </div>
            <div className="feature-card-mobile text-center">
              <Bell className="h-6 w-6 mx-auto mb-2 text-red-600" />
              <h4 className="font-medium text-sm">Notifications</h4>
            </div>
            <div className="feature-card-mobile text-center">
              <Truck className="h-6 w-6 mx-auto mb-2 text-blue-700" />
              <h4 className="font-medium text-sm">Route Management</h4>
            </div>
            <div className="feature-card-mobile text-center">
              <BarChart3 className="h-6 w-6 mx-auto mb-2 text-green-700" />
              <h4 className="font-medium text-sm">Analytics</h4>
            </div>
            <div className="feature-card-mobile text-center">
              <Calendar className="h-6 w-6 mx-auto mb-2 text-purple-700" />
              <h4 className="font-medium text-sm">Order Management</h4>
            </div>
            <div className="feature-card-mobile text-center">
              <IndianRupee className="h-6 w-6 mx-auto mb-2 text-amber-600" />
              <h4 className="font-medium text-sm">Custom Pricing</h4>
            </div>
            <div className="feature-card-mobile text-center">
              <UserCheck className="h-6 w-6 mx-auto mb-2 text-cyan-600" />
              <h4 className="font-medium text-sm">Customer Relations</h4>
            </div>
            <div className="feature-card-mobile text-center">
              <TrendingUp className="h-6 w-6 mx-auto mb-2 text-rose-600" />
              <h4 className="font-medium text-sm">Growth Tools</h4>
            </div>
            <div className="feature-card-mobile text-center">
              <Shield className="h-6 w-6 mx-auto mb-2 text-gray-700" />
              <h4 className="font-medium text-sm">Security</h4>
            </div>
            <div className="feature-card-mobile text-center">
              <Smartphone className="h-6 w-6 mx-auto mb-2 text-slate-600" />
              <h4 className="font-medium text-sm">Mobile Optimized</h4>
            </div>
            <div className="feature-card-mobile text-center">
              <Clock className="h-6 w-6 mx-auto mb-2 text-blue-800" />
              <h4 className="font-medium text-sm">24/7 Availability</h4>
            </div>
            <div className="feature-card-mobile text-center">
              <MessageSquare className="h-6 w-6 mx-auto mb-2 text-violet-600" />
              <h4 className="font-medium text-sm">Customer Support</h4>
            </div>
            <div className="feature-card-mobile text-center">
              <Route className="h-6 w-6 mx-auto mb-2 text-emerald-700" />
              <h4 className="font-medium text-sm">Location Services</h4>
            </div>
            <div className="feature-card-mobile text-center">
              <CreditCard className="h-6 w-6 mx-auto mb-2 text-indigo-700" />
              <h4 className="font-medium text-sm">Multi-Payment</h4>
            </div>
          </div>
        </section>

        {/* Customer Features */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Customer Features</h2>
            <p className="text-lg text-gray-600">Everything you need for convenient milk delivery</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {customerFeatures.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader className="text-center pb-4">
                  <div className="dairy-blue p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">{feature.description}</p>
                  <ul className="space-y-2">
                    {feature.details.map((detail, i) => (
                      <li key={i} className="flex items-center text-sm text-gray-600">
                        <div className="w-2 h-2 bg-primary-blue rounded-full mr-3"></div>
                        {detail}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Milkman Features */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Milkman Features</h2>
            <p className="text-lg text-gray-600">Powerful tools to grow and manage your dairy business</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {milkmanFeatures.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader className="text-center pb-4">
                  <div className="dairy-green p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">{feature.description}</p>
                  <ul className="space-y-2">
                    {feature.details.map((detail, i) => (
                      <li key={i} className="flex items-center text-sm text-gray-600">
                        <div className="w-2 h-2 bg-secondary-green rounded-full mr-3"></div>
                        {detail}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Platform Features */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Platform Features</h2>
            <p className="text-lg text-gray-600">Built on a reliable and secure foundation</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {platformFeatures.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader className="text-center pb-4">
                  <div className="bg-gray-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm mb-4">{feature.description}</p>
                  <ul className="space-y-2">
                    {feature.details.map((detail, i) => (
                      <li key={i} className="flex items-center text-xs text-gray-600">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></div>
                        {detail}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Call to Action */}
        <section className="text-center bg-gradient-to-r from-primary-blue to-secondary-green rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of customers and milkmen who trust Dairy Connect for their daily milk needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => setLocation("/")}
              className="bg-white text-primary-blue hover:bg-gray-100 px-8 py-3"
            >
              Join as Customer
            </Button>
            <Button 
              onClick={() => setLocation("/")}
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-primary-blue px-8 py-3"
            >
              Join as Milkman
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}