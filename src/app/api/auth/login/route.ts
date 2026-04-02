import { NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    let { username, password } = await req.json();
    username = (username || '').toLowerCase(); // Enforce case-insensitivity

    const users = getAllUsers();
    const user = users.find(u => u.username.toLowerCase() === username && u.passwordHash === password);

    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    // Set a simplistic cookie session for Panamax (MVP JSON Session)
    const sessionToken = Buffer.from(JSON.stringify({ username: user.username, role: user.role })).toString('base64');
    
    const res = NextResponse.json({ success: true, message: 'Logged in successfully' });
    
    // Cookie valid for 1 day
    res.headers.set(
      'Set-Cookie', 
      `panamax_session=${sessionToken}; Path=/; HttpOnly; Max-Age=86400`
    );

    return res;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true, message: 'Logged out successfully' });
  res.headers.set('Set-Cookie', 'panamax_session=; Path=/; HttpOnly; Max-Age=0');
  return res;
}
