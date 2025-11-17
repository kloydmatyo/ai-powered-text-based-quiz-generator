import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { comparePassword } from '@/lib/auth';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required');
        }

        await connectDB();
        const user = await User.findOne({ email: credentials.email });

        if (!user || !user.password) {
          throw new Error('Invalid email or password');
        }

        const isValid = await comparePassword(credentials.password, user.password);
        
        if (!isValid) {
          throw new Error('Invalid email or password');
        }

        if (!user.emailVerified) {
          throw new Error('Please verify your email before logging in');
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.username,
          role: user.role,
        };
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        await connectDB();
        
        // Check if user exists
        let existingUser = await User.findOne({ email: user.email });
        
        if (!existingUser) {
          // User not registered - reject sign in
          throw new Error('Email not registered. Please register first before using Google Sign-In.');
        }
        
        // Link Google account to existing user if not already linked
        if (!existingUser.googleId) {
          existingUser.googleId = account.providerAccountId;
          existingUser.image = user.image;
          existingUser.emailVerified = true;
          await existingUser.save();
        }
        
        user.id = existingUser._id.toString();
        user.role = existingUser.role;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/?view=login',
    error: '/?view=login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
