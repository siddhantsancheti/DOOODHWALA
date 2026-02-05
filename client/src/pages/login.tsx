import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import { Loader2, Milk, Phone, ArrowRight, RotateCcw } from "lucide-react";
import logoImage from "@/assets/logo.png";
import { useToast } from "@/hooks/use-toast";


export default function Login() {
  console.log('Login component rendering');
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/login/:message?");
  const { toast } = useToast();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    if (params?.message) {
      const message = decodeURIComponent(params.message);
      toast({
        title: "Authentication Required",
        description: message,
        variant: "destructive",
      });
    }
  }, [params?.message, toast]);

  // Timer for resend functionality
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === "otp" && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const cleaned = value.replace(/\D/g, '');

    // Format as 5 + 5 digit pattern (10 digits total)
    if (cleaned.length <= 5) {
      return cleaned;
    } else if (cleaned.length <= 10) {
      return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    } else {
      // Limit to 10 digits max
      return `${cleaned.slice(0, 5)} ${cleaned.slice(5, 10)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  const { login, sendOtp, isOtpLoading, isLoginLoading } = useAuth();

  const handleSendOTP = async () => {
    if (!phone || phone.length < 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid 10-digit phone number",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Convert formatted phone to E.164 format for India
      const cleanPhone = phone.replace(/\D/g, '');
      const e164Phone = `+91${cleanPhone}`; // India country code

      const data = await sendOtp({ phone: e164Phone });

      if (data.success) {
        toast({
          title: "OTP Sent",
          description: data.debugCode
            ? `Your code is: ${data.debugCode}`
            : "Please check your phone for the verification code.",
        });
        setStep("otp");
        // Start resend timer (5 minutes as per rate limit)
        setResendTimer(300);
        setCanResend(false);
      } else {
        toast({
          title: "Failed to Send OTP",
          description: data.message || "Please check your phone number and try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Network error. Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    setIsResending(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const e164Phone = `+91${cleanPhone}`;

      const data = await sendOtp({ phone: e164Phone });

      if (data.success) {
        toast({
          title: "OTP Resent",
          description: "A new verification code has been sent to your phone.",
        });
        // Reset timer (5 minutes)
        setResendTimer(300);
        setCanResend(false);
        setOtp(""); // Clear previous OTP
      } else {
        toast({
          title: "Failed to Resend OTP",
          description: data.message || "Please wait and try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Network error. Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyOTP = async () => {
    // Prevent multiple submissions
    if (isSubmitting) {
      console.log('OTP verification already in progress, skipping duplicate request');
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const e164Phone = `+91${cleanPhone}`;

      console.log('Submitting OTP verification:', { phone: e164Phone, otp });
      const data = await login({ phone: e164Phone, otp: otp });
      console.log('OTP verification response:', data);

      if (data.success) {
        toast({
          title: "Login Successful",
          description: "Welcome! Setting up your account...",
        });

        // Clear the OTP field to prevent resubmission
        setOtp("");

        // Small delay to show success message, then navigate to user type selection
        setTimeout(() => {
          setLocation("/user-type-selection");
        }, 1000);
      } else {
        toast({
          title: "Invalid OTP",
          description: data.message || "Please check your code and try again.",
          variant: "destructive",
        });
        throw new Error(data?.message || 'Verification failed');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md modern-card border-0 shadow-2xl">
        <CardContent className="p-6 sm:p-12">
          {/* Logo */}
          <div className="flex justify-center mb-6 sm:mb-8">
            <div className="w-32 h-32 bg-transparent flex items-center justify-center">
              <img src={logoImage} alt="DOOODHWALA Logo" className="w-full h-full object-contain" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl text-center mb-3 gradient-text font-bold">DOOODHWALA</h1>
          <p className="text-center text-muted-foreground mb-8 sm:mb-10 text-lg sm:text-xl">
            Your trusted dairy delivery marketplace
          </p>

          {/* Login Header */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-semibold text-center text-foreground">
              Sign in to your account
            </h2>
          </div>

          {/* Login Form */}
          <div className="space-y-6">
            {step === "phone" ? (
              <>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="phone" className="block text-base font-medium text-foreground mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="98765 43210"
                        value={phone}
                        onChange={handlePhoneChange}
                        className="flex w-full rounded-md border border-input bg-background ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm h-12 text-base !pl-[50px] !pr-[50px] !pt-[11px] !pb-[11px]"
                        maxLength={11}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleSendOTP}
                    disabled={phone.replace(/\D/g, '').length !== 10 || isSubmitting}
                    className="w-full h-12 modern-button font-medium rounded-lg shadow-sm mobile-button text-lg"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Continue with Phone
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="otp" className="block text-base font-medium text-foreground mb-2">
                      Enter Verification Code
                    </label>
                    <p className="text-base text-muted-foreground mb-3">
                      We sent a code to {phone}
                    </p>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="text-center text-xl sm:text-2xl tracking-widest h-14 mobile-form-input font-bold"
                      maxLength={6}
                    />
                  </div>

                  <Button
                    onClick={handleVerifyOTP}
                    disabled={otp.length !== 6 || isSubmitting}
                    className="w-full h-12 modern-button font-medium rounded-lg shadow-sm mobile-button text-lg"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      "Verify & Continue"
                    )}
                  </Button>

                  {/* Resend OTP Section */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                    <div className="text-base text-muted-foreground">
                      {resendTimer > 0 ? (
                        `Resend OTP in ${resendTimer}s`
                      ) : (
                        "Didn't receive the code?"
                      )}
                    </div>
                    <Button
                      onClick={handleResendOTP}
                      disabled={!canResend || isResending}
                      variant="ghost"
                      size="sm"
                      className="text-brand-primary hover:text-brand-primary/80 p-2 h-auto font-medium text-base"
                    >
                      {isResending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <>
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Resend OTP
                        </>
                      )}
                    </Button>
                  </div>

                  <button
                    onClick={() => {
                      setStep("phone");
                      setOtp("");
                      setResendTimer(0);
                      setCanResend(false);
                    }}
                    className="w-full text-base text-muted-foreground hover:text-foreground transition-colors py-2"
                  >
                    Use a different number
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 sm:mt-12 text-center">
            <p className="text-sm text-muted-foreground">
              By signing in, you agree to our Terms & Privacy Policy
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}