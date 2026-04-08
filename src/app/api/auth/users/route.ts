import { NextResponse } from 'next/server';
import { getAllUsers, saveAllUsers } from '@/lib/auth';

function getCurrentUser(req: Request) {
  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader.match(/panamax_session=([^;]+)/);
  if (match) {
    try {
      const decoded = Buffer.from(match[1], 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }
  return null;
}

export async function GET(req: Request) {
  const user = getCurrentUser(req);
  
  // If no user context, just return what the current identity is for UI rendering (so sidebars can hide Admin Ops)
  const url = new URL(req.url);
  if (url.searchParams.get('me') === 'true') {
    return NextResponse.json({ success: true, user });
  }

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const users = getAllUsers();

  // Non-Admins get a sanitized list (No sensitive fields)
  if (user.role !== 'admin') {
    const sanitized = users.map(u => ({ username: u.username, role: u.role }));
    return NextResponse.json({ success: true, users: sanitized });
  }

  // Admin gets rich user data
  return NextResponse.json({ success: true, users });
}

export async function POST(req: Request) {
  const user = getCurrentUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    let { username, email, password, role } = await req.json();
    if (!username || !password || !role) {
      return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });
    }
    
    username = username.toLowerCase(); // Enforce case-insensitive usernames

    const users = getAllUsers();
    if (users.find(u => u.username.toLowerCase() === username)) {
      return NextResponse.json({ success: false, error: 'User already exists' }, { status: 400 });
    }

    users.push({ username, email, passwordHash: password, role });
    saveAllUsers(users);

    return NextResponse.json({ success: true, message: 'User created' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const user = getCurrentUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    let { username, password } = await req.json();
    username = username?.toLowerCase();
    
    const users = getAllUsers();
    const target = users.find(u => u.username.toLowerCase() === username);
    
    if (!target) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    
    target.passwordHash = password;
    saveAllUsers(users);

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const user = getCurrentUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    let { username } = await req.json();
    username = username?.toLowerCase();
    
    if (username === 'admin') return NextResponse.json({ success: false, error: 'Cannot delete primary admin' }, { status: 400 });
    
    let users = getAllUsers();
    const initSize = users.length;
    users = users.filter(u => u.username.toLowerCase() !== username);

    if (users.length === initSize) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

    saveAllUsers(users);
    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
