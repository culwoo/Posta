export const PLATFORM_ADMIN_EMAIL = '4242fire@gmail.com';

export const ADMIN_EMAILS = [
    PLATFORM_ADMIN_EMAIL,
    'sseeooyyuunn@naver.com',
    'mides3912@gmail.com'
];

export const isAdminEmail = (email) => {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email.toLowerCase());
};
