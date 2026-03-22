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

import CustomerDashboardScreen from '../screens/customer/CustomerDashboardScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';
import ViewOrdersScreen from '../screens/customer/ViewOrdersScreen';
import OrderScreen from '../screens/customer/OrderScreen';
import CheckoutScreen from '../screens/customer/CheckoutScreen';
import TrackingScreen from '../screens/customer/TrackingScreen';
import ServiceRequestsScreen from '../screens/customer/ServiceRequestsScreen';
import YDPageScreen from '../screens/customer/YDPageScreen';

import MilkmanDashboardScreen from '../screens/milkman/MilkmanDashboardScreen';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import GatewayScreen from '../screens/admin/GatewayScreen';
import CustomerAnalyticsScreen from '../screens/admin/CustomerAnalyticsScreen';
import LocationRecommendationsScreen from '../screens/admin/LocationRecommendationsScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    const { isAuthenticated, isLoading, user } = useAuth();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' }}>
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    const needsOnboarding = isAuthenticated && user && !user.userType;

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
                {!isAuthenticated ? (
                    // Public stack
                    <Stack.Screen name="Login" component={LoginScreen} />
                ) : needsOnboarding ? (
                    // Onboarding stack
                    <Stack.Group>
                        <Stack.Screen name="UserTypeSelection" component={UserTypeSelectionScreen} />
                        <Stack.Screen name="CustomerProfileSetup" component={CustomerProfileSetupScreen} />
                        <Stack.Screen name="MilkmanProfileSetup" component={MilkmanProfileSetupScreen} />
                    </Stack.Group>
                ) : (
                    // Main App stack based on role
                    <Stack.Group>
                        {user!.userType === 'customer' && (
                            <Stack.Group>
                                <Stack.Screen name="CustomerHome" component={CustomerDashboardScreen} />
                                <Stack.Screen name="Profile" component={ProfileScreen} />
                                <Stack.Screen name="ViewOrders" component={ViewOrdersScreen} />
                                <Stack.Screen name="Order" component={OrderScreen} />
                                <Stack.Screen name="Checkout" component={CheckoutScreen} />
                                <Stack.Screen name="Tracking" component={TrackingScreen} />
                                <Stack.Screen name="ServiceRequests" component={ServiceRequestsScreen} />
                                <Stack.Screen name="YDPage" component={YDPageScreen} />
                            </Stack.Group>
                        )}
                        {user!.userType === 'milkman' && (
                            <Stack.Group>
                                <Stack.Screen name="MilkmanHome" component={MilkmanDashboardScreen} />
                                <Stack.Screen name="Profile" component={ProfileScreen} />
                            </Stack.Group>
                        )}
                        {user!.userType === 'admin' && (
                            <Stack.Group>
                                <Stack.Screen name="AdminHome" component={AdminDashboardScreen} />
                                <Stack.Screen name="Gateway" component={GatewayScreen} />
                                <Stack.Screen name="CustomerAnalytics" component={CustomerAnalyticsScreen} />
                                <Stack.Screen name="LocationRecommendations" component={LocationRecommendationsScreen} />
                            </Stack.Group>
                        )}
                        {/* Fallback to something if role is weird */}
                        {!['customer', 'milkman', 'admin'].includes(user!.userType || '') && (
                            <Stack.Screen name="Login" component={LoginScreen} />
                        )}
                    </Stack.Group>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
