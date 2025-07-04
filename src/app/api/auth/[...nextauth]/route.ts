import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Decode base64 hash to avoid environment variable parsing issues
        const envHashB64 = process.env.USER_PASSWORD_HASH_B64;
        const envHash = envHashB64 ? Buffer.from(envHashB64, 'base64').toString('utf-8') : '';
        
        console.log('🔐 Auth attempt:', {
          username: credentials?.username,
          password: credentials?.password,
          hasPassword: !!credentials?.password,
          envHashB64Exists: !!envHashB64,
          envHashB64Length: envHashB64?.length,
          decodedHashExists: !!envHash,
          decodedHashLength: envHash?.length,
          decodedHashFirstChars: envHash?.substring(0, 10),
          decodedHashLastChars: envHash?.substring(envHash.length - 10),
          decodedHash: envHash // Full decoded hash for debugging
        });
        
        const expectedUsername = process.env.USER_USERNAME || 'admin';
        
        if (credentials?.username === expectedUsername && envHash) {
          const passwordMatch = await bcrypt.compare(
            credentials.password || '',
            envHash
          );
          
          console.log('🔐 Password match result:', passwordMatch);
          
          if (passwordMatch) {
            console.log('✅ Authentication successful');
            return { id: '1', name: expectedUsername, email: 'user@example.com' };
          }
        }
        
        console.log('❌ Authentication failed');
        return null;
      }
    })
  ],
  pages: {
    signIn: '/login',
    signOut: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    }
  }
});

export { handler as GET, handler as POST };