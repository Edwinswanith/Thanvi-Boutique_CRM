// Tests never touch Atlas: provide a dummy secret and blank out the real URI.
process.env.AUTH_SECRET = "test-secret-test-secret-test-secret-1234";
process.env.MONGODB_URI = "";
