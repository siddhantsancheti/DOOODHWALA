import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLocation, useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, User, Building, Package, MapPin, Camera } from "lucide-react";
import { Navbar } from "@/components/navbar";

import logoImage from "@/assets/logo.png";
// import newLogoImage from "@assets/Flat vector logo with milk jug icon_1756714038327.png";

export default function ProfileSetup() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/profile-setup");
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");

  // Get user type from URL params
  const userType = new URLSearchParams(window.location.search).get('type') || 'customer';

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '', // For customers
    address: '',
    businessName: '', // For milkmen
    pricePerLiter: '', // For milkmen
    deliveryTimeStart: '06:00', // For milkmen
    deliveryTimeEnd: '09:00', // For milkmen
    latitude: '',
    longitude: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getCurrentLocation = () => {
    setIsLocating(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString()
        }));
        setIsLocating(false);
        toast({
          title: "Location Captured",
          description: "Your current location has been saved.",
        });
      },
      (error) => {
        console.error("Error getting location:", error);
        setLocationError("Unable to retrieve your location. Please enter address manually.");
        setIsLocating(false);
      }
    );
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await apiRequest("/api/users/profile-image", "POST", formData);
      const data = await res.json();

      setUploadedImageUrl(data.imageUrl);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

      toast({
        title: "Photo Uploaded",
        description: "Your profile photo has been uploaded.",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.address || (userType === 'customer' && !formData.email)) {
      toast({
        title: "Required Fields Missing",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (userType === 'customer') {
        // Update customer profile
        const res = await apiRequest('/api/customers/profile', 'PATCH', {
          name: formData.name,
          email: formData.email,
          address: formData.address,
          latitude: formData.latitude,
          longitude: formData.longitude,
        });
        await res.json();
      } else {
        // Create milkman profile
        const res = await apiRequest('/api/milkmen', 'POST', {
          contactName: formData.name,
          businessName: formData.businessName || formData.name,
          address: formData.address,
          pricePerLiter: formData.pricePerLiter || '50',
          deliveryTimeStart: formData.deliveryTimeStart,
          deliveryTimeEnd: formData.deliveryTimeEnd,
        });
        await res.json();
      }

      toast({
        title: "Profile Updated Successfully!",
        description: `Your ${userType} profile has been updated. Welcome to DOOODHWALA!`,
      });

      // Refresh the profile data cache
      if (userType === 'customer') {
        queryClient.invalidateQueries({ queryKey: ["/api/customers/profile"] });
      }

      // Navigate to appropriate dashboard
      if (userType === 'customer') {
        setLocation('/customer');
      } else {
        setLocation('/milkman');
      }

    } catch (error: any) {
      console.error('Profile creation error:', error);
      toast({
        title: "Profile Setup Failed",
        description: error.message || "Failed to create profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center px-4 py-16">
        {/* Profile Photo / Logo Area */}
        <div className="mb-8 relative group">
          <div className="w-40 h-40 bg-blue-100 rounded-full flex items-center justify-center mx-auto overflow-hidden border-4 border-white shadow-lg relative">
            {uploadedImageUrl ? (
              <img src={uploadedImageUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <img src={logoImage} alt="DOOODHWALA" className="w-24 h-24 object-contain" />
            )}

            {isUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
          </div>

          <label
            htmlFor="setup-image-upload"
            className="absolute bottom-0 left-1/2 translate-x-12 translate-y-[-10px] p-3 bg-primary text-primary-foreground rounded-full shadow-lg cursor-pointer hover:bg-primary/90 transition-all hover:scale-110"
          >
            <Camera className="w-5 h-5" />
            <input
              id="setup-image-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              disabled={isUploading}
            />
          </label>
        </div>

        {/* Welcome Text */}
        <div className="text-center mb-16 max-w-4xl">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="text-gray-900 dark:text-white">Complete Your </span>
            <span className="bg-gradient-to-r from-blue-600 via-teal-500 to-green-500 bg-clip-text text-transparent">
              {userType === 'customer' ? 'Customer' : 'Milkman'}
            </span>
            <span className="text-gray-900 dark:text-white"> Profile!</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 font-medium">
            {userType === 'customer'
              ? 'Set up your delivery preferences to start ordering fresh milk'
              : 'Set up your dairy business to start serving customers'}
          </p>
        </div>

        {/* Profile Setup Form Card */}
        <Card className="w-full max-w-2xl bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl overflow-hidden">
          <CardContent className="p-12">
            {/* Profile Type Icon */}
            <div className="flex justify-center mb-8">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg ${userType === 'customer'
                ? 'bg-gradient-to-br from-blue-500 via-purple-500 to-purple-600'
                : 'bg-gradient-to-br from-orange-500 to-red-500'
                }`}>
                {userType === 'customer' ? (
                  <img src={logoImage} alt="Customer" className="w-10 h-10 object-contain p-1 bg-white/20 rounded-lg" />
                ) : (
                  <Building className="w-10 h-10 text-white" />
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Field */}
              <div className="space-y-3">
                <Label htmlFor="name" className="text-lg font-semibold text-gray-900 dark:text-white">
                  {userType === 'customer' ? 'Full Name' : 'Contact Name'} *
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder={userType === 'customer' ? 'Enter your full name' : 'Your contact name'}
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="h-14 text-lg border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 dark:focus:border-blue-400"
                  required
                />
              </div>

              {/* Email Field for Customers */}
              {userType === 'customer' && (
                <div className="space-y-3">
                  <Label htmlFor="email" className="text-lg font-semibold text-gray-900 dark:text-white">
                    Email Address *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="h-14 text-lg border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 dark:focus:border-blue-400"
                    required
                  />
                </div>
              )}

              {/* Business Name for Milkmen */}
              {userType === 'milkman' && (
                <div className="space-y-3">
                  <Label htmlFor="businessName" className="text-lg font-semibold text-gray-900 dark:text-white">Business Name</Label>
                  <Input
                    id="businessName"
                    type="text"
                    placeholder="Enter your dairy business name"
                    value={formData.businessName}
                    onChange={(e) => handleInputChange('businessName', e.target.value)}
                    className="h-14 text-lg border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-orange-500 dark:focus:border-orange-400"
                  />
                </div>
              )}

              {/* Address Field */}
              <div className="space-y-3">
                <Label htmlFor="address" className="text-lg font-semibold text-gray-900 dark:text-white">
                  {userType === 'customer' ? 'Delivery Address' : 'Business Address'} *
                </Label>
                <Textarea
                  id="address"
                  placeholder={userType === 'customer'
                    ? 'Enter your complete delivery address'
                    : 'Enter your business address'}
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="min-h-[100px] text-lg border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 dark:focus:border-blue-400"
                  required
                />
              </div>

              {/* Location Field */}
              <div className="space-y-3">
                <Label className="text-lg font-semibold text-gray-900 dark:text-white">
                  Location Coordinates
                </Label>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={getCurrentLocation}
                    disabled={isLocating}
                    className="w-full h-12 text-base font-medium border-2 border-dashed border-gray-300 hover:border-blue-500 hover:text-blue-600 dark:border-gray-600 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-colors"
                  >
                    {isLocating ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Getting Location...
                      </>
                    ) : formData.latitude && formData.longitude ? (
                      <>
                        <MapPin className="h-5 w-5 mr-2 text-green-500" />
                        Location Captured ({formData.latitude}, {formData.longitude})
                      </>
                    ) : (
                      <>
                        <MapPin className="h-5 w-5 mr-2" />
                        Get Current Location
                      </>
                    )}
                  </Button>
                  {locationError && (
                    <p className="text-sm text-red-500 mt-1">{locationError}</p>
                  )}
                </div>
              </div>

              {/* Milkman-specific fields */}
              {userType === 'milkman' && (
                <>
                  <div className="space-y-3">
                    <Label htmlFor="pricePerLiter" className="text-lg font-semibold text-gray-900 dark:text-white">Price per Liter (₹)</Label>
                    <Input
                      id="pricePerLiter"
                      type="number"
                      placeholder="50"
                      value={formData.pricePerLiter}
                      onChange={(e) => handleInputChange('pricePerLiter', e.target.value)}
                      className="h-14 text-lg border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-orange-500 dark:focus:border-orange-400"
                      min="1"
                      step="0.01"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="deliveryTimeStart" className="text-lg font-semibold text-gray-900 dark:text-white">Delivery Start Time</Label>
                      <Input
                        id="deliveryTimeStart"
                        type="time"
                        value={formData.deliveryTimeStart}
                        onChange={(e) => handleInputChange('deliveryTimeStart', e.target.value)}
                        className="h-14 text-lg border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-orange-500 dark:focus:border-orange-400"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="deliveryTimeEnd" className="text-lg font-semibold text-gray-900 dark:text-white">Delivery End Time</Label>
                      <Input
                        id="deliveryTimeEnd"
                        type="time"
                        value={formData.deliveryTimeEnd}
                        onChange={(e) => handleInputChange('deliveryTimeEnd', e.target.value)}
                        className="h-14 text-lg border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-orange-500 dark:focus:border-orange-400"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Submit Button */}
              <div className="pt-6">
                <Button
                  type="submit"
                  disabled={isSubmitting || !formData.name || !formData.address || (userType === 'customer' && !formData.email)}
                  className={`w-full h-16 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 active:scale-95 ${userType === 'customer'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                    : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
                    } text-white border-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin mr-3" />
                      Creating Profile...
                    </>
                  ) : (
                    'Complete Setup & Get Started'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}