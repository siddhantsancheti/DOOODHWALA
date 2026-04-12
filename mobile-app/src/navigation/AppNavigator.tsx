import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { ActivityIndicator, View } from 'react-native';

// Placeholder screens for navigation structure integration
import LoginScreen from '../screens/LoginScreen';
import UserTypeSelectionScreen from '../screens/UserTypeSelectionScreen';
import CustomerProfileSetupScreen from '../screens/CustomerProfileSetupScreen';
import MilkmanProfileSetupScreen from '../screens/MilkmanProfileSetupScreen';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';

import CustomerDashboardScreen from '../screens/customer/CustomerDashboardScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';
import ViewOrdersScreen from '../screens/customer/ViewOrdersScreen';
import OrderScreen from '../screens/customer/OrderScreen';
import CheckoutScreen from '../screens/customer/CheckoutScreen';
import TrackingScreen from '../screens/customer/TrackingScreen';
import ServiceRequestsScreen from '../screens/customer/ServiceRequestsScreen';
import YDPageScreen from '../screens/customer/YDPageScreen';
import BillsScreen from '../screens/customer/BillsScreen';
import ChatScreen from '../screens/ChatScreen';
import CustomerCareScreen from '../screens/CustomerCareScreen';

import MilkmanDashboardScreen from '../screens/milkman/MilkmanDashboardScreen';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import GatewayScreen from '../screens/admin/GatewayScreen';
import CustomerAnalyticsScreen from '../screens/admin/CustomerAnalyticsScreen';
import LocationRecommendationsScreen from '../screens/admin/LocationRecommendationsScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
    
    const { data: customerProfile, isLoading: isCustLoading } = useQuery({
        queryKey: ['/api/customers/profile'],
        enabled: isAuthenticated && user?.userType === 'customer',
        retry: false
    });

    const { data: milkmanProfile, isLoading: isMilkLoading } = useQuery({
        queryKey: ['/api/milkmen/profile'],
        enabled: isAuthenticated && user?.userType === 'milkman',
        retry: false
    });

    const DEV_BYPASS_MODE = false; // Set to 'customer', 'milkman', or false for dev

    const effectiveIsAuthenticated = !!DEV_BYPASS_MODE || isAuthenticated;
    const effectiveUser = DEV_BYPASS_MODE 
        ? { id: 'dev-1', userType: DEV_BYPASS_MODE }
        : user;

    const isLoading = isAuthLoading || (!DEV_BYPASS_MODE && effectiveIsAuthenticated && effectiveUser?.userType === 'customer' && isCustLoading) || (!DEV_BYPASS_MODE && effectiveIsAuthenticated && effectiveUser?.userType === 'milkman' && isMilkLoading);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' }}>
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    const isCustomerProfileComplete = (profile: any) => {
        if (DEV_BYPASS_MODE) return true;
        return !!profile && !!profile.name && !!profile.address;
    };

    const isMilkmanProfileComplete = (profile: any) => {
        if (DEV_BYPASS_MODE && (DEV_BYPASS_MODE as any) === 'milkman') return true;
        return !!profile && !!profile.contactName && !!profile.businessName;
    };

    const needsOnboarding = !DEV_BYPASS_MODE && effectiveIsAuthenticated && effectiveUser && !effectiveUser.userType;
    const needsCustomerSetup = !DEV_BYPASS_MODE && effectiveIsAuthenticated && effectiveUser?.userType === 'customer' && !isCustomerProfileComplete(customerProfile);
    const needsMilkmanSetup = !DEV_BYPASS_MODE && effectiveIsAuthenticated && effectiveUser?.userType === 'milkman' && !isMilkmanProfileComplete(milkmanProfile);

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
                {!effectiveIsAuthenticated ? (
                    // Public stack
                    <Stack.Screen name="Login" component={LoginScreen} />
                ) : (needsOnboarding || needsCustomerSetup || needsMilkmanSetup) ? (
                    // Onboarding stack (forced if profile incomplete)
                    <Stack.Group>
                        <Stack.Screen name="UserTypeSelection" component={UserTypeSelectionScreen} />
                        <Stack.Screen name="CustomerProfileSetup" component={CustomerProfileSetupScreen} />
                        <Stack.Screen name="MilkmanProfileSetup" component={MilkmanProfileSetupScreen} />
                    </Stack.Group>
                ) : (
                    // Main App stack based on role
                    <Stack.Group>
                        {effectiveUser!.userType === 'customer' && (
                            <Stack.Group>
                                <Stack.Screen name="CustomerHome" component={CustomerDashboardScreen} />
                                <Stack.Screen name="Profile" component={ProfileScreen} />
                                <Stack.Screen name="ViewOrders" component={ViewOrdersScreen} />
                                <Stack.Screen name="Order" component={OrderScreen} />
                                <Stack.Screen name="Checkout" component={CheckoutScreen} />
                                <Stack.Screen name="Tracking" component={TrackingScreen} />
                                <Stack.Screen name="ServiceRequests" component={ServiceRequestsScreen} />
                                <Stack.Screen name="YDPage" component={YDPageScreen} />
                                <Stack.Screen name="Bills" component={BillsScreen} />
                                <Stack.Screen name="Chat" component={ChatScreen} />
                                <Stack.Screen name="CustomerCare" component={CustomerCareScreen} />
                            </Stack.Group>
                        )}
                        {effectiveUser!.userType === 'milkman' && (
                            <Stack.Group>
                                <Stack.Screen name="MilkmanHome" component={MilkmanDashboardScreen} />
                                <Stack.Screen name="Profile" component={ProfileScreen} />
                                <Stack.Screen name="Chat" component={ChatScreen} />
                                <Stack.Screen name="CustomerCare" component={CustomerCareScreen} />
                            </Stack.Group>
                        )}
                        {effectiveUser!.userType === 'admin' && (
                            <Stack.Group>
                                <Stack.Screen name="AdminHome" component={AdminDashboardScreen} />
                                <Stack.Screen name="Gateway" component={GatewayScreen} />
                                <Stack.Screen name="CustomerAnalytics" component={CustomerAnalyticsScreen} />
                                <Stack.Screen name="LocationRecommendations" component={LocationRecommendationsScreen} />
                            </Stack.Group>
                        )}
                        {/* Fallback to something if role is weird */}
                        {!['customer', 'milkman', 'admin'].includes(effectiveUser!.userType || '') && (
                            <Stack.Screen name="Login" component={LoginScreen} />
                        )}
                    </Stack.Group>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
