import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const PrivacyPolicy = () => {
    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <Card className="max-w-4xl mx-auto shadow-lg">
                <CardHeader className="border-b">
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Privacy Policy
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Last Updated: {new Date().toLocaleDateString()}
                    </p>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[80vh] p-6">
                        <div className="space-y-6 text-sm md:text-base">
                            <section>
                                <h3 className="text-lg font-semibold mb-2">1. Introduction</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    DOOODHWALA ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application and services. We enable a direct connection between Milkmen and Customers for daily dairy needs.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-2">2. Data We Collect</h3>
                                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                                    <li>
                                        <strong>Phone Numbers:</strong> We collect your phone number to facilitate login via One-Time Password (OTP) and for essential communication regarding your orders.
                                    </li>
                                    <li>
                                        <strong>Location Data:</strong> We access your approximate and precise location to accurate delivery addresses and helping you find nearby milkmen. This data is used solely for service delivery.
                                    </li>
                                    <li>
                                        <strong>Profile Images:</strong> If you upload a profile picture, we store this image to help milkmen identify their customers and vice-versa.
                                    </li>
                                    <li>
                                        <strong>Order History:</strong> We maintain records of your orders and deliveries to generate accurate monthly bills.
                                    </li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-2">3. How We Use Your Data</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    Your data is used strictly for:
                                    <ul className="list-disc pl-5 mt-2 space-y-1">
                                        <li>Managing your subscription and daily orders.</li>
                                        <li>Generating monthly bills and tracking payments.</li>
                                        <li>Connecting you with service providers (Milkmen) in your vicinity.</li>
                                        <li>Sending critical service notifications (e.g., "Milk Delivered").</li>
                                    </ul>
                                    We do <strong>not</strong> sell your personal data to third parties.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-2">4. Third-Party Services</h3>
                                <p className="text-muted-foreground mb-2">We trust the following partners to help us deliver our services:</p>
                                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                                    <li><strong>Neon (PostgreSQL):</strong> Secure database hosting for your account information.</li>
                                    <li><strong>Cloudinary:</strong> Secure ongoing storage for your profile images.</li>
                                    <li><strong>Razorpay:</strong> Secure processing of payments. We do not store your full card details or banking passwords.</li>
                                    <li><strong>Google Cloud/Firebase:</strong> For reliable map services and notifications.</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-2">5. Data Retention & Deletion</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    We retain your data only as long as your account is active. You have the right to request the deletion of your account at any time. Upon deletion, your personal profile, delivery logs, and images will be permanently removed from our PostgreSQL database and file storage systems, except for billing records we are legally required to keep.
                                    <br /><br />
                                    To request deletion, please contact support or use the "Delete Account" option in the app settings.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-2">6. Contact Us</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    If you have questions about this policy, please contact us at: <a href="mailto:support@dooodhwala.com" className="text-primary hover:underline">support@dooodhwala.com</a>
                                </p>
                            </section>
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
};

export default PrivacyPolicy;
