import { NextResponse } from 'next/server';
import { generateCaptchaChallenge } from '@/lib/auth/captcha';

export async function GET() {
  const challenge = generateCaptchaChallenge();
  return NextResponse.json({
    success: true,
    data: {
      question: challenge.question,
      challenge_token: challenge.challenge_token,
      expires_in_seconds: challenge.expires_in_seconds,
    },
  });
}
