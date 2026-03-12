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
import MilkmanDashboardScreen from '../screens/milkman/MilkmanDashboardScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    const { isAuthenticated, isLoading, user } = useAuth();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    const needsOnboarding = isAuthenticated && user && !user.userType;

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
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
                            <Stack.Screen name="CustomerHome" component={CustomerDashboardScreen} />
                        )}
                        {user!.userType === 'milkman' && (
                            <Stack.Screen name="MilkmanHome" component={MilkmanDashboardScreen} />
                        )}
                        {user!.userType === 'admin' && (
                            <Stack.Screen name="AdminHome" component={AdminDashboardScreen} />
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
