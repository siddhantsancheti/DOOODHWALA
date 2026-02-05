import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  MapPin,
  Plus,
  X,
  Clock,
  Trash2,
  IndianRupee,
  Loader2,
  Package
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import newLogoImage from "@assets/Flat vector logo with milk jug icon_1756714038327.png";

// Types
interface AddressDetails {
  houseNumber: string;
  buildingName: string;
  streetName: string;
  area: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

interface DairyItem {
  name: string;
  unit: string;
  price: string;
  isCustom?: boolean;
}

interface DeliverySlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export default function MilkmanProfileSetup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [serviceAddress, setServiceAddress] = useState("");
  const [showCustomItemForm, setShowCustomItemForm] = useState(false);
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);

  // Address details state
  const [addressDetails, setAddressDetails] = useState<AddressDetails>({
    houseNumber: "",
    buildingName: "",
    streetName: "",
    area: "",
    landmark: "",
    city: "",
    state: "",
    pincode: "",
    country: "India"
  });

  // Dairy items state
  const [dairyItems, setDairyItems] = useState<DairyItem[]>([
    { name: "Fresh Milk", unit: "per litre", price: "" },
    { name: "Buffalo Milk", unit: "per litre", price: "" },
    { name: "Toned Milk", unit: "per litre", price: "" },
    { name: "Double Toned Milk", unit: "per litre", price: "" },
    { name: "Skimmed Milk", unit: "per litre", price: "" }
  ]);

  const [newCustomItem, setNewCustomItem] = useState({
    name: "",
    unit: "",
    price: ""
  });

  // Delivery slots state
  const [deliverySlots, setDeliverySlots] = useState<DeliverySlot[]>([
    { id: "1", name: "Morning", startTime: "06:00", endTime: "09:00", isActive: true },
    { id: "2", name: "Evening", startTime: "17:00", endTime: "20:00", isActive: true }
  ]);

  const [newSlot, setNewSlot] = useState({
    name: "",
    startTime: "06:00",
    endTime: "09:00"
  });

  // Auto-generate complete address when details change
  useEffect(() => {
    const parts = [
      addressDetails.houseNumber,
      addressDetails.buildingName,
      addressDetails.streetName,
      addressDetails.area,
      addressDetails.landmark,
      addressDetails.city,
      addressDetails.state,
      addressDetails.pincode,
      addressDetails.country
    ].filter(part => part.trim());

    setServiceAddress(parts.join(", "));
  }, [addressDetails]);

  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      if (!navigator.geolocation) {
        throw new Error("Geolocation is not supported by this browser");
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocoding using Nominatim API
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
      );

      if (!response.ok) {
        throw new Error("Failed to get address from coordinates");
      }

      const data = await response.json();
      const address = data.address || {};

      setAddressDetails({
        houseNumber: address.house_number || "",
        buildingName: address.building || "",
        streetName: address.road || "",
        area: address.suburb || address.neighbourhood || "",
        landmark: address.amenity || "",
        city: address.city || address.town || address.village || "",
        state: address.state || "",
        pincode: address.postcode || "",
        country: address.country || "India"
      });

      toast({
        title: "Location detected",
        description: "Address details have been filled automatically"
      });
    } catch (error) {
      console.error("Error getting location:", error);
      toast({
        title: "Location Error",
        description: "Could not get your current location. Please enter manually.",
        variant: "destructive"
      });
    } finally {
      setIsGettingLocation(false);
    }
  };

  const addCustomItem = () => {
    if (newCustomItem.name.trim() && newCustomItem.unit.trim()) {
      setDairyItems([...dairyItems, {
        ...newCustomItem,
        isCustom: true
      }]);
      setNewCustomItem({ name: "", unit: "", price: "" });
      setShowCustomItemForm(false);
      toast({
        title: "Product added",
        description: `${newCustomItem.name} has been added to your product list`
      });
    }
  };

  const removeCustomItem = (index: number) => {
    const updatedItems = dairyItems.filter((_, i) => i !== index);
    setDairyItems(updatedItems);
    toast({
      title: "Product removed",
      description: "Custom product has been removed from your list"
    });
  };

  const updateDairyItemPrice = (index: number, price: string) => {
    const updatedItems = [...dairyItems];
    updatedItems[index].price = price;
    setDairyItems(updatedItems);
  };

  const addDeliverySlot = () => {
    if (newSlot.name.trim()) {
      const newId = (deliverySlots.length + 1).toString();
      setDeliverySlots([...deliverySlots, {
        id: newId,
        ...newSlot,
        isActive: true
      }]);
      setNewSlot({ name: "", startTime: "06:00", endTime: "09:00" });
      setShowSlotForm(false);
      setEditingSlot(null);
      toast({
        title: "Delivery slot added",
        description: `${newSlot.name} slot has been added to your schedule`
      });
    }
  };

  const editDeliverySlot = (slot: DeliverySlot) => {
    setNewSlot({
      name: slot.name,
      startTime: slot.startTime,
      endTime: slot.endTime
    });
    setEditingSlot(parseInt(slot.id));
    setShowSlotForm(true);
  };

  const updateDeliverySlot = () => {
    if (editingSlot !== null && newSlot.name.trim()) {
      const updatedSlots = deliverySlots.map(slot =>
        slot.id === editingSlot.toString()
          ? { ...slot, ...newSlot }
          : slot
      );
      setDeliverySlots(updatedSlots);
      setNewSlot({ name: "", startTime: "06:00", endTime: "09:00" });
      setShowSlotForm(false);
      setEditingSlot(null);
      toast({
        title: "Delivery slot updated",
        description: "Your delivery slot has been updated successfully"
      });
    }
  };

  const removeDeliverySlot = (id: string) => {
    const updatedSlots = deliverySlots.filter(slot => slot.id !== id);
    setDeliverySlots(updatedSlots);
    toast({
      title: "Delivery slot removed",
      description: "The delivery slot has been removed from your schedule"
    });
  };

  const toggleSlotActive = (id: string) => {
    const updatedSlots = deliverySlots.map(slot =>
      slot.id === id ? { ...slot, isActive: !slot.isActive } : slot
    );
    setDeliverySlots(updatedSlots);
  };

  const formatTime12Hour = (time24: string) => {
    const [hours, minutes] = time24.split(':');
    const hour12 = parseInt(hours) % 12 || 12;
    const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);

      // Prepare dairy products with prices
      const productsWithPrices = dairyItems
        .filter(item => item.price && parseFloat(item.price) > 0)
        .map(item => ({
          name: item.name,
          unit: item.unit,
          price: item.price,
          isCustom: item.isCustom || false
        }));

      // Prepare active delivery slots
      const activeSlots = deliverySlots
        .filter(slot => slot.isActive)
        .map(slot => ({
          name: slot.name,
          startTime: slot.startTime,
          endTime: slot.endTime
        }));

      const profileData = {
        contactName: formData.get('contactName') as string,
        businessName: formData.get('businessName') as string,
        address: serviceAddress,
        pricePerLiter: productsWithPrices.find(p => p.name === 'Fresh Milk')?.price || '50',
        deliveryTimeStart: activeSlots[0]?.startTime || '06:00',
        deliveryTimeEnd: activeSlots[0]?.endTime || '09:00',
        bankAccountHolderName: formData.get('bankAccountHolderName') as string,
        bankAccountType: formData.get('bankAccountType') as string,
        bankAccountNumber: formData.get('bankAccountNumber') as string,
        bankIfscCode: formData.get('bankIfscCode') as string,
        bankName: formData.get('bankName') as string,
        upiId: formData.get('upiId') as string,
        dairyItems: productsWithPrices,
        deliverySlots: activeSlots
      };

      console.log('Submitting milkman profile:', profileData);

      const response = await apiRequest('/api/milkmen', 'POST', profileData);

      if (response.ok) {
        toast({
          title: "Profile created successfully!",
          description: "Your milkman profile is now complete. You can start serving customers."
        });

        // Invalidate auth user query so user state is refreshed
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        // Also invalidate milkman profile query if needed
        await queryClient.invalidateQueries({ queryKey: ["/api/milkmen/profile"] });

        // Redirect to milkman dashboard
        setLocation('/milkman');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create profile');
      }
    } catch (error) {
      console.error('Profile creation error:', error);
      toast({
        title: "Error creating profile",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center px-4 py-16">
        {/* Logo Badge */}
        <div className="mb-8">
          <div className="w-40 h-40 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <Package className="w-24 h-24 text-blue-600" />
          </div>
        </div>

        {/* Welcome Text */}
        <div className="text-center mb-16 max-w-4xl">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="text-gray-900 dark:text-white">Complete Your </span>
            <span className="bg-gradient-to-r from-orange-600 via-red-500 to-red-600 bg-clip-text text-transparent">
              Milkman
            </span>
            <span className="text-gray-900 dark:text-white"> Profile!</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 font-medium">
            Set up your dairy business to start serving customers
          </p>
        </div>

        {/* Profile Setup Form Card */}
        <Card className="w-full max-w-6xl bg-white dark:bg-gray-800 border-0 shadow-xl rounded-2xl overflow-hidden">
          <CardContent className="p-12">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Contact Information */}
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white border-b pb-3">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="contactName" className="text-base font-medium">Full Name *</Label>
                    <Input
                      id="contactName"
                      name="contactName"
                      placeholder="e.g., Rajesh Kumar"
                      required
                      className="mt-2 h-12 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-orange-500 dark:focus:border-orange-400"
                    />
                  </div>
                  <div>
                    <Label htmlFor="businessName" className="text-base font-medium">Business Name *</Label>
                    <Input
                      id="businessName"
                      name="businessName"
                      placeholder="e.g., Rajesh Kumar Dairy"
                      required
                      className="mt-2 h-12 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-orange-500 dark:focus:border-orange-400"
                    />
                  </div>
                </div>
              </div>

              {/* Service Address */}
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white border-b pb-3">Service Area</h3>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={getCurrentLocation}
                      disabled={isGettingLocation}
                      className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-medium flex items-center gap-2 rounded-xl"
                    >
                      <MapPin className="h-4 w-4" />
                      {isGettingLocation ? 'Getting Location...' : 'Use Current Location'}
                    </Button>
                  </div>

                  {/* Detailed Address Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="houseNumber" className="text-base font-medium">House/Flat Number</Label>
                      <Input
                        id="houseNumber"
                        name="houseNumber"
                        placeholder="e.g., 123, A-501"
                        value={addressDetails.houseNumber}
                        onChange={(e) => setAddressDetails({ ...addressDetails, houseNumber: e.target.value })}
                        className="mt-2 h-12 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-orange-500 dark:focus:border-orange-400"
                      />
                    </div>
                    <div>
                      <Label htmlFor="buildingName" className="text-base font-medium">Building/Society Name</Label>
                      <Input
                        id="buildingName"
                        name="buildingName"
                        placeholder="e.g., Sunshine Apartments"
                        value={addressDetails.buildingName}
                        onChange={(e) => setAddressDetails({ ...addressDetails, buildingName: e.target.value })}
                        className="mt-2 h-12 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-orange-500 dark:focus:border-orange-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="streetName">Street Name *</Label>
                      <Input
                        id="streetName"
                        name="streetName"
                        placeholder="e.g., MG Road"
                        value={addressDetails.streetName}
                        onChange={(e) => setAddressDetails({ ...addressDetails, streetName: e.target.value })}
                        className="mt-2 h-12 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-orange-500 dark:focus:border-orange-400"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="area">Area/Locality *</Label>
                      <Input
                        id="area"
                        name="area"
                        placeholder="e.g., Koregaon Park"
                        value={addressDetails.area}
                        onChange={(e) => setAddressDetails({ ...addressDetails, area: e.target.value })}
                        className="mt-2 h-12 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-orange-500 dark:focus:border-orange-400"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="landmark">Landmark</Label>
                    <Input
                      id="landmark"
                      name="landmark"
                      placeholder="e.g., Near City Hospital"
                      value={addressDetails.landmark}
                      onChange={(e) => setAddressDetails({ ...addressDetails, landmark: e.target.value })}
                      className="mt-2 h-12 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-orange-500 dark:focus:border-orange-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        name="city"
                        placeholder="e.g., Mumbai"
                        value={addressDetails.city}
                        onChange={(e) => setAddressDetails({ ...addressDetails, city: e.target.value })}
                        className="mt-2 h-12 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-orange-500 dark:focus:border-orange-400"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        name="state"
                        placeholder="e.g., Maharashtra"
                        value={addressDetails.state}
                        onChange={(e) => setAddressDetails({ ...addressDetails, state: e.target.value })}
                        className="mt-2 h-12 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-orange-500 dark:focus:border-orange-400"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="pincode">Pincode *</Label>
                      <Input
                        id="pincode"
                        name="pincode"
                        placeholder="e.g., 400001"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        value={addressDetails.pincode}
                        onChange={(e) => setAddressDetails({ ...addressDetails, pincode: e.target.value })}
                        className="mt-2 h-12 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-orange-500 dark:focus:border-orange-400"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        name="country"
                        placeholder="e.g., India"
                        value={addressDetails.country || "India"}
                        onChange={(e) => setAddressDetails({ ...addressDetails, country: e.target.value })}
                        className="mt-2 h-12 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-orange-500 dark:focus:border-orange-400"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="formattedAddress">Complete Address *</Label>
                    <Textarea
                      id="formattedAddress"
                      name="formattedAddress"
                      placeholder="This will be auto-filled based on the details above"
                      value={serviceAddress}
                      onChange={(e) => setServiceAddress(e.target.value)}
                      className="min-h-[80px] border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-orange-500 dark:focus:border-orange-400"
                      required
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Tip: For accurate service area, ensure street name and area/locality are filled correctly
                    </p>
                  </div>
                </div>
              </div>

              {/* Bank Account Details */}
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white border-b pb-3">Bank Account Details (Optional)</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Add your bank account details to receive payments directly from customers</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bankAccountHolderName" className="text-base font-medium">Account Holder Name</Label>
                    <Input
                      id="bankAccountHolderName"
                      name="bankAccountHolderName"
                      placeholder="e.g., Rajesh Kumar"
                      className="mt-2 h-12 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-orange-500 dark:focus:border-orange-400"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bankAccountType" className="text-base font-medium">Account Type</Label>
                    <select
                      id="bankAccountType"
                      name="bankAccountType"
                      className="mt-2 h-12 text-base flex w-full rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-background px-3 py-2 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Select Account Type</option>
                      <option value="savings">Savings Account</option>
                      <option value="current">Current Account</option>
                      <option value="overdraft">Overdraft Account</option>
                      <option value="joint">Joint Account</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bankAccountNumber" className="text-base font-medium">Account Number</Label>
                    <Input
                      id="bankAccountNumber"
                      name="bankAccountNumber"
                      placeholder="e.g., 1234567890123456"
                      pattern="[0-9]{9,18}"
                      className="mt-2 h-12 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-orange-500 dark:focus:border-orange-400"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bankIfscCode" className="text-base font-medium">IFSC Code</Label>
                    <Input
                      id="bankIfscCode"
                      name="bankIfscCode"
                      placeholder="e.g., SBIN0001234"
                      pattern="[A-Z]{4}0[A-Z0-9]{6}"
                      className="mt-2 h-12 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-orange-500 dark:focus:border-orange-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="bankName" className="text-base font-medium">Bank Name</Label>
                    <Input
                      id="bankName"
                      name="bankName"
                      placeholder="e.g., State Bank of India"
                      className="mt-2 h-12 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-orange-500 dark:focus:border-orange-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="upiId" className="text-base font-medium">UPI ID (Optional)</Label>
                    <Input
                      id="upiId"
                      name="upiId"
                      placeholder="e.g., rajeshkumar@paytm"
                      className="mt-2 h-12 text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-orange-500 dark:focus:border-orange-400"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-blue-600 dark:text-blue-400 mt-1">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">Payment Information</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Your bank account details are securely stored and used only for receiving payments from customers. We never share this information with third parties.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dairy Products & Pricing */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Dairy Products & Pricing</h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Additional Dairy Products (Optional)</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Set prices for additional products you offer</p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => setShowCustomItemForm(true)}
                      variant="outline"
                      className="flex items-center gap-2 text-sm whitespace-nowrap"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Add Custom Item</span>
                      <span className="sm:hidden">+</span>
                    </Button>
                  </div>

                  {/* Custom Item Form */}
                  {showCustomItemForm && (
                    <div className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900 dark:text-white">Add Custom Dairy Product</h4>
                        <Button
                          type="button"
                          onClick={() => {
                            setShowCustomItemForm(false);
                            setNewCustomItem({ name: "", unit: "", price: "" });
                          }}
                          variant="ghost"
                          size="sm"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <Label htmlFor="customItemName">Product Name</Label>
                          <Input
                            id="customItemName"
                            placeholder="e.g., Lassi"
                            value={newCustomItem.name}
                            onChange={(e) => setNewCustomItem({ ...newCustomItem, name: e.target.value })}
                            className="border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-orange-500 dark:focus:border-orange-400"
                          />
                        </div>
                        <div>
                          <Label htmlFor="customItemUnit">Unit</Label>
                          <Input
                            id="customItemUnit"
                            placeholder="e.g., per 250ml"
                            value={newCustomItem.unit}
                            onChange={(e) => setNewCustomItem({ ...newCustomItem, unit: e.target.value })}
                            className="border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-orange-500 dark:focus:border-orange-400"
                          />
                        </div>
                        <div>
                          <Label htmlFor="customItemPrice">Price (₹)</Label>
                          <Input
                            id="customItemPrice"
                            type="number"
                            step="0.1"
                            min="1"
                            placeholder="0.00"
                            value={newCustomItem.price}
                            onChange={(e) => setNewCustomItem({ ...newCustomItem, price: e.target.value })}
                            className="border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-orange-500 dark:focus:border-orange-400"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end mt-3">
                        <Button
                          type="button"
                          onClick={addCustomItem}
                          disabled={!newCustomItem.name.trim() || !newCustomItem.unit.trim()}
                          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-medium rounded-xl"
                        >
                          Add Product
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-3">
                    {dairyItems.map((item, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className="flex-1">
                          <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
                          <span className="text-sm text-gray-500 ml-2">({item.unit})</span>
                          {item.isCustom && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded ml-2">
                              Custom
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <IndianRupee className="h-4 w-4 text-gray-400" />
                          <Input
                            type="number"
                            step="0.1"
                            min="1"
                            placeholder="0.00"
                            value={item.price}
                            onChange={(e) => updateDairyItemPrice(index, e.target.value)}
                            className="w-24 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-orange-500 dark:focus:border-orange-400"
                          />
                          {item.isCustom && (
                            <Button
                              type="button"
                              onClick={() => removeCustomItem(index)}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Delivery Schedule Slots */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delivery Schedule</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSlotForm(true)}
                    className="text-sm"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Add Slot</span>
                    <span className="sm:hidden">+</span>
                  </Button>
                </div>

                {/* Existing Slots */}
                <div className="space-y-3">
                  {deliverySlots.map((slot) => (
                    <div key={slot.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Switch
                          checked={slot.isActive}
                          onCheckedChange={() => toggleSlotActive(slot.id)}
                        />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{slot.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {formatTime12Hour(slot.startTime)} - {formatTime12Hour(slot.endTime)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => editDeliverySlot(slot)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Clock className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDeliverySlot(slot.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add/Edit Slot Form */}
                {showSlotForm && (
                  <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                      {editingSlot !== null ? 'Edit Delivery Slot' : 'Add New Delivery Slot'}
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="slotName">Slot Name</Label>
                        <Input
                          id="slotName"
                          placeholder="e.g., Morning, Afternoon, Evening"
                          value={newSlot.name}
                          onChange={(e) => setNewSlot({ ...newSlot, name: e.target.value })}
                          className="border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-orange-500 dark:focus:border-orange-400"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="slotStartTime">Start Time</Label>
                          <select
                            id="slotStartTime"
                            value={newSlot.startTime}
                            onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                            className="flex h-10 w-full rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="05:00">5:00 AM</option>
                            <option value="05:30">5:30 AM</option>
                            <option value="06:00">6:00 AM</option>
                            <option value="06:30">6:30 AM</option>
                            <option value="07:00">7:00 AM</option>
                            <option value="07:30">7:30 AM</option>
                            <option value="08:00">8:00 AM</option>
                            <option value="08:30">8:30 AM</option>
                            <option value="09:00">9:00 AM</option>
                            <option value="09:30">9:30 AM</option>
                            <option value="10:00">10:00 AM</option>
                            <option value="17:00">5:00 PM</option>
                            <option value="17:30">5:30 PM</option>
                            <option value="18:00">6:00 PM</option>
                            <option value="18:30">6:30 PM</option>
                            <option value="19:00">7:00 PM</option>
                            <option value="19:30">7:30 PM</option>
                            <option value="20:00">8:00 PM</option>
                          </select>
                        </div>
                        <div>
                          <Label htmlFor="slotEndTime">End Time</Label>
                          <select
                            id="slotEndTime"
                            value={newSlot.endTime}
                            onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                            className="flex h-10 w-full rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="07:00">7:00 AM</option>
                            <option value="07:30">7:30 AM</option>
                            <option value="08:00">8:00 AM</option>
                            <option value="08:30">8:30 AM</option>
                            <option value="09:00">9:00 AM</option>
                            <option value="09:30">9:30 AM</option>
                            <option value="10:00">10:00 AM</option>
                            <option value="10:30">10:30 AM</option>
                            <option value="11:00">11:00 AM</option>
                            <option value="18:00">6:00 PM</option>
                            <option value="18:30">6:30 PM</option>
                            <option value="19:00">7:00 PM</option>
                            <option value="19:30">7:30 PM</option>
                            <option value="20:00">8:00 PM</option>
                            <option value="20:30">8:30 PM</option>
                            <option value="21:00">9:00 PM</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowSlotForm(false);
                            setEditingSlot(null);
                            setNewSlot({ name: "", startTime: "06:00", endTime: "09:00" });
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={editingSlot !== null ? updateDeliverySlot : addDeliverySlot}
                          disabled={!newSlot.name.trim()}
                          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-medium rounded-xl"
                        >
                          {editingSlot !== null ? 'Update Slot' : 'Add Slot'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <Button
                  type="submit"
                  disabled={isSubmitting || !serviceAddress.trim()}
                  className="w-full h-16 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 active:scale-95 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin mr-3" />
                      Creating Profile...
                    </>
                  ) : (
                    'Complete Setup & Start Serving Customers'
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