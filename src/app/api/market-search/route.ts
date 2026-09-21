import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Market search API route operational',
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json({
      status: 'success',
      query: body.query || '',
      results: [],
    });
  } catch {
    return NextResponse.json(
      { error: 'Invalid payload' },
      { status: 400 }
    );
  }
}