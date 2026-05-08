// Test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-unit-testing-only';
process.env.JWT_PARTNER_SECRET = 'test-partner-jwt-secret';
process.env.JWT_STUDENT_SECRET = 'test-student-jwt-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.DEFAULT_OTP = '123456';
process.env.SKIP_OTP_DELIVERY = 'true';
process.env.DEFAULT_PARTNER_PASSWORD = 'Welcome@123';
process.env.RAZORPAY_KEY_ID = 'rzp_test_xxxxx';
process.env.RAZORPAY_KEY_SECRET = 'test_secret';
