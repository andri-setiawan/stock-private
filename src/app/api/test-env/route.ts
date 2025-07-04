import { NextResponse } from 'next/server';

export async function GET() {
  const passwordHash = process.env.USER_PASSWORD_HASH;
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  
  return NextResponse.json({ 
    hashExists: !!passwordHash,
    hashLength: passwordHash?.length || 0,
    secretExists: !!nextAuthSecret,
    urlExists: !!nextAuthUrl,
    nodeEnv: process.env.NODE_ENV
  });
}