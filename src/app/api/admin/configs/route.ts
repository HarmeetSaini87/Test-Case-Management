import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), 'dataHub', 'configs.json');

function readConfig() {
  if (!fs.existsSync(configPath)) {
    const initial = { testCategories: [], testingTypes: [], testIntents: [] };
    fs.writeFileSync(configPath, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

export async function GET() {
  return NextResponse.json({ success: true, configs: readConfig() });
}

export async function POST(req: Request) {
  const { type, name, enabled } = await req.json();
  const config = readConfig();
  
  if (!config[type]) config[type] = [];
  
  const newItem = {
    id: String(Date.now()),
    name,
    enabled: enabled ?? true
  };
  
  config[type].push(newItem);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  return NextResponse.json({ success: true, item: newItem });
}

export async function PUT(req: Request) {
  const { type, id, name, enabled } = await req.json();
  const config = readConfig();
  
  const idx = config[type]?.findIndex((i: any) => i.id === id);
  if (idx > -1) {
    config[type][idx] = { ...config[type][idx], name, enabled };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return NextResponse.json({ success: true });
  }
  
  return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const id = url.searchParams.get('id');
  
  const config = readConfig();
  if (type && config[type]) {
    config[type] = config[type].filter((i: any) => i.id !== id);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return NextResponse.json({ success: true });
  }
  
  return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
}
