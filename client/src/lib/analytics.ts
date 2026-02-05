// DOOODHWALA Analytics Tracking
// @ts-ignore - Firebase config import
import { analytics } from '../../../firebase-config';
import { logEvent } from 'firebase/analytics';

// Type-safe analytics with proper typing
const typedAnalytics: any = analytics;

// Analytics event types for DOOODHWALA
export const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
  if (typedAnalytics) {
    logEvent(typedAnalytics, eventName, parameters);
    console.log(`Analytics: ${eventName}`, parameters);
  }
};

// Customer journey tracking
export const trackCustomerLogin = (loginMethod: string) => {
  trackEvent('customer_login', { method: loginMethod });
};

export const trackCustomerRegistration = (registrationMethod: string) => {
  trackEvent('customer_registration', { method: registrationMethod });
};

export const trackMilkmanLogin = (milkmanId: string) => {
  trackEvent('milkman_login', { milkman_id: milkmanId });
};

// Order tracking
export const trackOrderPlaced = (orderData: {
  milkmanId: string;
  totalAmount: number;
  itemCount: number;
  paymentMethod: string;
}) => {
  trackEvent('order_placed', {
    milkman_id: orderData.milkmanId,
    value: orderData.totalAmount,
    currency: 'INR',
    item_count: orderData.itemCount,
    payment_method: orderData.paymentMethod
  });
};

export const trackOrderAccepted = (orderId: string, milkmanId: string) => {
  trackEvent('order_accepted', { order_id: orderId, milkman_id: milkmanId });
};

export const trackOrderDelivered = (orderId: string, deliveryTime: number) => {
  trackEvent('order_delivered', { 
    order_id: orderId, 
    delivery_time_minutes: deliveryTime 
  });
};

// Payment tracking
export const trackPaymentInitiated = (paymentMethod: string, amount: number) => {
  trackEvent('payment_initiated', {
    payment_method: paymentMethod,
    value: amount,
    currency: 'INR'
  });
};

export const trackPaymentCompleted = (paymentMethod: string, amount: number) => {
  trackEvent('purchase', {
    payment_method: paymentMethod,
    value: amount,
    currency: 'INR'
  });
};

export const trackPaymentFailed = (paymentMethod: string, errorCode: string) => {
  trackEvent('payment_failed', {
    payment_method: paymentMethod,
    error_code: errorCode
  });
};

// YD (Your Doodhwala) tracking
export const trackYDAssigned = (customerId: string, milkmanId: string) => {
  trackEvent('yd_assigned', {
    customer_id: customerId,
    milkman_id: milkmanId
  });
};

export const trackYDChatMessage = (messageType: 'text' | 'voice' | 'image') => {
  trackEvent('yd_chat_message', { message_type: messageType });
};

// Feature usage tracking
export const trackFeatureUsed = (featureName: string) => {
  trackEvent('feature_used', { feature_name: featureName });
};

export const trackLocationSearch = (searchRadius: number, resultsCount: number) => {
  trackEvent('location_search', {
    radius_meters: searchRadius,
    results_count: resultsCount
  });
};

// Performance tracking
export const trackPageLoad = (pageName: string, loadTime: number) => {
  trackEvent('page_view', {
    page_title: pageName,
    page_location: window.location.href,
    load_time_ms: loadTime
  });
};

// Error tracking
export const trackError = (errorType: string, errorMessage: string, errorLocation: string) => {
  trackEvent('app_error', {
    error_type: errorType,
    error_message: errorMessage,
    error_location: errorLocation
  });
};