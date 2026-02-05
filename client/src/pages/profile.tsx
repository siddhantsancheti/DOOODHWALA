import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Navbar } from "@/components/navbar";
import { MobileNav } from "@/components/mobile-nav";
import { useLanguage, getTranslatedText } from "@/hooks/useLanguage";
import {
  User,
  MapPin,
  Phone,
  Mail,
  Edit3,
  Save,
  X,
  Camera,
  Loader2
} from "lucide-react";
import type { Customer, Milkman } from "@shared/schema";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  // Ensure we have the latest user data including profileImageUrl
  const { data: latestUser } = useQuery({
    queryKey: ["/api/auth/user"],
    initialData: user,
    enabled: !!user
  });

  const displayUser = latestUser || user;

  const { language } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  // Using useRef to access the hidden file input
  const fileInputRef = useState<HTMLInputElement | null>(null);

  const [editData, setEditData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    address: "",
    name: "",
    businessName: "",
    pricePerLiter: "",
    deliveryTimeStart: "",
    deliveryTimeEnd: "",
  });

  // Debug logging
  console.log("Profile page - User data:", user);
  console.log("Profile page - User phone:", user?.phone);
  console.log("Profile page - User email:", user?.email);

  const { data: customerProfile, isLoading: profileLoading } = useQuery<Customer>({
    queryKey: ["/api/customers/profile"],
    enabled: !!user && user.userType === 'customer',
  });

  const { data: milkmanProfile } = useQuery<Milkman>({
    queryKey: ["/api/milkmen/profile"],
    enabled: !!user && user.userType === 'milkman',
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      if (customerProfile) {
        await apiRequest("/api/customers/profile", "PATCH", data);
      } else if (milkmanProfile) {
        await apiRequest("/api/milkmen/profile", "PATCH", data);
      }
    },
    onSuccess: () => {
      // Invalidate all relevant caches to refresh user data
      queryClient.invalidateQueries({ queryKey: ["/api/customers/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/milkmen/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

      // Also refetch user data immediately
      queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });

      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your profile and contact information have been updated successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
      const data = await res.json(); // Assuming apiRequest wraps fetch and we need to parse json if not handled elsewhere? 
      // Actually lib/queryClient apiRequest returns a Response object, so we need .json()

      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

      toast({
        title: "Profile Photo Updated",
        description: "Your profile photo has been updated successfully.",
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

  const handleEditClick = () => {
    console.log("Edit profile clicked - User data:", user);
    const profile = customerProfile || milkmanProfile;
    const editDataObj = {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      address: (profile as any)?.address || "",
      name: (profile as any)?.name || `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
      businessName: (profile as any)?.businessName || "",
      pricePerLiter: (profile as any)?.pricePerLiter || "",
      deliveryTimeStart: (profile as any)?.deliveryTimeStart || "",
      deliveryTimeEnd: (profile as any)?.deliveryTimeEnd || "",
    };
    console.log("Edit data set:", editDataObj);
    setEditData(editDataObj);
    setIsEditing(true);
  };

  const handleSave = () => {
    updateProfileMutation.mutate(editData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({
      firstName: "",
      lastName: "",
      email: "",
      address: "",
      name: "",
      businessName: "",
      pricePerLiter: "",
      deliveryTimeStart: "",
      deliveryTimeEnd: "",
    });
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const profile = customerProfile || milkmanProfile || {} as any;
  const profileType = customerProfile ? "Customer" : milkmanProfile ? "Milkman" : "User";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-0">
      <Navbar />
      <MobileNav />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{getTranslatedText('Profile Information', language)}</h1>

          {/* Avatar Section */}
          <div className="relative group mx-4">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-gray-800 shadow-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              {displayUser?.profileImageUrl ? (
                <img
                  src={displayUser.profileImageUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-gray-400" />
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
            </div>

            <label
              htmlFor="profile-image-upload"
              className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-md cursor-pointer hover:bg-primary/90 transition-colors"
            >
              <Camera className="w-4 h-4" />
              <input
                id="profile-image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={isUploading}
              />
            </label>
          </div>

          {!isEditing ? (
            <Button
              onClick={handleEditClick}
              className="modern-button text-white font-semibold py-3 h-auto"
            >
              <Edit3 className="mr-2 h-4 w-4" />
              {getTranslatedText('Edit Profile', language)}
            </Button>
          ) : (
            <div className="flex space-x-2">
              <Button
                onClick={handleSave}
                disabled={updateProfileMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="mr-2 h-4 w-4" />
                {getTranslatedText('Save', language)}
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
              >
                <X className="mr-2 h-4 w-4" />
                {getTranslatedText('Cancel', language)}
              </Button>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5 text-primary-blue" />
                {getTranslatedText('Personal Information', language)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">{getTranslatedText('Account Type', language)}</Label>
                <div className="mt-1 flex items-center">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400">
                    {profileType}
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">{getTranslatedText('Name', language)}</Label>
                {isEditing ? (
                  <Input
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="mt-1"
                    placeholder="Enter your full name"
                  />
                ) : (
                  <p className="mt-1 text-gray-900 dark:text-gray-100">{(profile as any)?.name || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || getTranslatedText('Not provided', language)}</p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">{getTranslatedText('First Name', language)}</Label>
                <p className="mt-1 text-gray-900 dark:text-gray-100">{user?.firstName || getTranslatedText('Not provided', language)}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">{getTranslatedText('Last Name', language)}</Label>
                <p className="mt-1 text-gray-900 dark:text-gray-100">{user?.lastName || getTranslatedText('Not provided', language)}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">{getTranslatedText('User ID', language)}</Label>
                <p className="mt-1 text-gray-900 dark:text-gray-100 font-mono text-sm">{user?.id}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">{getTranslatedText('Account Created', language)}</Label>
                <p className="mt-1 text-gray-900 dark:text-gray-100">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : getTranslatedText('Not available', language)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Phone className="mr-2 h-5 w-5 text-primary-blue" />
                {getTranslatedText('Contact Information', language)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">{getTranslatedText('Phone Number', language)}</Label>
                <div className="mt-1 flex items-center">
                  <Phone className="mr-2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  {user?.phone ? (
                    <>
                      <span className="text-gray-900 dark:text-gray-100 font-medium">{user.phone}</span>
                      {user?.isVerified && (
                        <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400">
                          {getTranslatedText('Verified', language)} ✓
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400 italic">{getTranslatedText('Not provided', language)}</span>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">{getTranslatedText('Email Address', language)}</Label>
                {isEditing ? (
                  <div className="mt-1 flex items-center">
                    <Mail className="mr-2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <Input
                      type="email"
                      value={editData.email}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                      placeholder="Enter your email address"
                      className="flex-1"
                    />
                  </div>
                ) : (
                  <div className="mt-1 flex items-center">
                    <Mail className="mr-2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                    {user?.email ? (
                      <span className="text-gray-900 dark:text-gray-100 font-medium">{user.email}</span>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400 italic">{getTranslatedText('Not provided', language)} - Click Edit to add</span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">{getTranslatedText('Address', language)}</Label>
                {isEditing ? (
                  <Textarea
                    value={editData.address}
                    onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                    className="mt-1"
                    rows={3}
                    placeholder="Enter your complete address"
                  />
                ) : (
                  <div className="mt-1 flex items-start">
                    <MapPin className="mr-2 h-4 w-4 text-gray-400 dark:text-gray-500 mt-1" />
                    <span className="text-gray-900 dark:text-gray-100">{(profile as any)?.address || getTranslatedText('Not provided', language)}</span>
                  </div>
                )}
              </div>


            </CardContent>
          </Card>

          {/* Profile Specific Information */}
          {customerProfile && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{getTranslatedText('Customer Details', language)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">{getTranslatedText('Assigned Milkman', language)}</Label>
                  <p className="mt-1 text-gray-900 dark:text-gray-100">
                    {(customerProfile as any)?.assignedMilkmanId ? `ID: ${(customerProfile as any).assignedMilkmanId}` : getTranslatedText('Not assigned', language)}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">{getTranslatedText('Regular Order Quantity', language)}</Label>
                  <p className="mt-1 text-gray-900 dark:text-gray-100">
                    {(customerProfile as any)?.regularOrderQuantity || getTranslatedText('Not set', language)}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">{getTranslatedText('Auto Payment', language)}</Label>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${(customerProfile as any)?.autoPayEnabled
                    ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400"
                    }`}>
                    {(customerProfile as any)?.autoPayEnabled ? getTranslatedText('Enabled', language) : getTranslatedText('Disabled', language)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {milkmanProfile && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{getTranslatedText('Milkman Details', language)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">{getTranslatedText('Business Name', language)}</Label>
                  {isEditing ? (
                    <Input
                      value={editData.businessName}
                      onChange={(e) => setEditData({ ...editData, businessName: e.target.value })}
                      className="mt-1"
                      placeholder="Enter business name"
                    />
                  ) : (
                    <p className="mt-1 text-gray-900 dark:text-gray-100">{(milkmanProfile as any)?.businessName}</p>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">{getTranslatedText('Price per Liter', language)}</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editData.pricePerLiter}
                      onChange={(e) => setEditData({ ...editData, pricePerLiter: e.target.value })}
                      className="mt-1"
                      placeholder="Enter price per liter"
                    />
                  ) : (
                    <p className="mt-1 text-gray-900 dark:text-gray-100">₹{(milkmanProfile as any)?.pricePerLiter}</p>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">{getTranslatedText('Delivery Time', language)}</Label>
                  {isEditing ? (
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="time"
                        value={editData.deliveryTimeStart}
                        onChange={(e) => setEditData({ ...editData, deliveryTimeStart: e.target.value })}
                        className="flex-1"
                      />
                      <span className="self-center">-</span>
                      <Input
                        type="time"
                        value={editData.deliveryTimeEnd}
                        onChange={(e) => setEditData({ ...editData, deliveryTimeEnd: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  ) : (
                    <p className="mt-1 text-gray-900 dark:text-gray-100">
                      {(milkmanProfile as any)?.deliveryTimeStart} - {(milkmanProfile as any)?.deliveryTimeEnd}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">{getTranslatedText('Rating', language)}</Label>
                  <p className="mt-1 text-gray-900 dark:text-gray-100">
                    {(milkmanProfile as any)?.rating ? `${(milkmanProfile as any).rating}★` : getTranslatedText('No ratings yet', language)}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">{getTranslatedText('Status', language)}</Label>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${(milkmanProfile as any)?.isAvailable
                    ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                    : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400"
                    }`}>
                    {(milkmanProfile as any)?.isAvailable ? getTranslatedText('Available', language) : getTranslatedText('Unavailable', language)}
                  </span>
                </div>

                {(milkmanProfile as any)?.verified && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">{getTranslatedText('Verification', language)}</Label>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400">
                      {getTranslatedText('Verified Business', language)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}