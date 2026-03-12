import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useAuth } from '../hooks/useAuth';

export default function LoginScreen({ navigation }: any) {
    const { sendOtp, login, isOtpLoading, isLoginLoading } = useAuth();
    const [step, setStep] = useState<'phone' | 'otp'>('phone');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [resendTimer, setResendTimer] = useState(0);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (step === 'otp' && resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => (prev <= 1 ? 0 : prev - 1));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [step, resendTimer]);

    const handlePhoneChange = (val: string) => {
        const cleaned = val.replace(/\D/g, '').slice(0, 10);
        setPhone(cleaned);
    };

    const handleSendOTP = async () => {
        if (phone.length < 10) {
            Alert.alert('Invalid Phone Number', 'Please enter a valid 10-digit phone number');
            return;
        }

        try {
            const e164Phone = `+91${phone}`;
            const data = await sendOtp({ phone: e164Phone });

            if (data.success) {
                setStep('otp');
                setResendTimer(300);
            } else {
                Alert.alert('Failed to Send OTP', data.message || 'Please try again.');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Network error');
        }
    };

    const handleVerifyOTP = async () => {
        try {
            const e164Phone = `+91${phone}`;
            const data = await login({ phone: e164Phone, otp });

            if (data.success) {
                // AppNavigator will automatically re-render and navigate because isAuthenticated becomes true.
            } else {
                Alert.alert('Invalid OTP', data.message || 'Please check your code and try again.');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Verification failed');
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <View style={styles.card}>
                    <Image
                        source={{ uri: 'https://via.placeholder.com/150' }} // Need local asset later
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={styles.title}>DOOODHWALA</Text>
                    <Text style={styles.subtitle}>Your trusted dairy delivery marketplace</Text>

                    <Text style={styles.header}>Sign in to your account</Text>

                    {step === 'phone' ? (
                        <View style={styles.form}>
                            <Text style={styles.label}>Phone Number</Text>
                            <View style={styles.inputContainer}>
                                <Text style={styles.prefix}>+91</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="98765 43210"
                                    keyboardType="phone-pad"
                                    value={phone}
                                    onChangeText={handlePhoneChange}
                                    maxLength={10}
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.button, phone.length !== 10 && styles.buttonDisabled]}
                                onPress={handleSendOTP}
                                disabled={phone.length !== 10 || isOtpLoading}
                            >
                                {isOtpLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.buttonText}>Continue with Phone</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.form}>
                            <Text style={styles.label}>Enter Verification Code</Text>
                            <Text style={styles.subLabel}>We sent a code to {phone}</Text>

                            <TextInput
                                style={styles.otpInput}
                                placeholder="123456"
                                keyboardType="number-pad"
                                value={otp}
                                onChangeText={(val) => setOtp(val.replace(/\D/g, '').slice(0, 6))}
                                maxLength={6}
                                textAlign="center"
                            />

                            <TouchableOpacity
                                style={[styles.button, otp.length !== 6 && styles.buttonDisabled]}
                                onPress={handleVerifyOTP}
                                disabled={otp.length !== 6 || isLoginLoading}
                            >
                                {isLoginLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.buttonText}>Verify & Continue</Text>
                                )}
                            </TouchableOpacity>

                            <View style={styles.resendContainer}>
                                <Text style={styles.resendText}>
                                    {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Didn't receive the code?"}
                                </Text>
                                <TouchableOpacity
                                    onPress={handleSendOTP}
                                    disabled={resendTimer > 0 || isOtpLoading}
                                >
                                    <Text style={[styles.resendLink, resendTimer > 0 && styles.resendLinkDisabled]}>
                                        Resend OTP
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity onPress={() => { setStep('phone'); setOtp(''); setResendTimer(0); }}>
                                <Text style={styles.changePhoneText}>Use a different number</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        justifyContent: 'center',
        padding: 20,
    },
    card: {
        padding: 20,
    },
    logo: {
        width: 100,
        height: 100,
        alignSelf: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#3b82f6', // Brand color
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        color: '#6b7280',
        marginBottom: 30,
    },
    header: {
        fontSize: 22,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 20,
    },
    form: {
        marginTop: 10,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 8,
    },
    subLabel: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        height: 50,
        marginBottom: 20,
        paddingHorizontal: 15,
    },
    prefix: {
        fontSize: 16,
        marginRight: 10,
        color: '#374151',
        fontWeight: '500',
    },
    input: {
        flex: 1,
        fontSize: 16,
    },
    otpInput: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        height: 56,
        fontSize: 24,
        letterSpacing: 5,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    button: {
        backgroundColor: '#3b82f6',
        height: 50,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonDisabled: {
        backgroundColor: '#9ca3af',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    resendContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 15,
    },
    resendText: {
        color: '#6b7280',
    },
    resendLink: {
        color: '#3b82f6',
        fontWeight: 'bold',
    },
    resendLinkDisabled: {
        color: '#9ca3af',
    },
    changePhoneText: {
        textAlign: 'center',
        color: '#6b7280',
        marginTop: 10,
        textDecorationLine: 'underline',
    }
});
