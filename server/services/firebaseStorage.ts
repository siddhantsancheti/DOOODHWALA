/**
 * The one Firebase Storage bucket, named once.
 *
 * Three routes each carried their own copy of this default — chat media, KYC
 * and ad creatives — and the ad one drifted to a bucket that does not exist,
 * so every ad upload failed against a real-looking name. A default repeated in
 * three files is a default that will disagree with itself eventually.
 */
export const STORAGE_BUCKET =
    process.env.FIREBASE_STORAGE_BUCKET || "dooodhwala-7dce6.firebasestorage.app";
