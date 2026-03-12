export type User = {
    id: string;
    username: string | null;
    email: string | null;
    phone: string;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
    userType: 'customer' | 'milkman' | 'admin' | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    isVerified: boolean | null;
    fcmToken: string | null;
    latitude: string | null;
    longitude: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
    lastActiveAt: Date | null;
};
