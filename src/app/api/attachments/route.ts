import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const attachDir = path.join(process.cwd(), 'dataHub', 'attachments');
const metaPath = path.join(process.cwd(), 'dataHub', 'attachments.json');

function readMeta() {
  if (!fs.existsSync(metaPath)) { fs.writeFileSync(metaPath, JSON.stringify({ attachments: [] }, null, 2)); return { attachments: [] }; }
  return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
}
function ensureDir() { if (!fs.existsSync(attachDir)) fs.mkdirSync(attachDir, { recursive: true }); }

export async function GET(req: Request) {
  const url = new URL(req.url);
  const refId = url.searchParams.get('refId');
  const data = readMeta();
  const list = refId ? data.attachments.filter((a: any) => a.refId === refId) : data.attachments;
  return NextResponse.json({ success: true, attachments: list });
}

export async function POST(req: Request) {
  ensureDir();
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const refId = formData.get('refId') as string;
    const refType = formData.get('refType') as string; // 'testcase' | 'execution'
    const uploadedBy = formData.get('uploadedBy') as string || 'admin';

    if (!file) return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });

    const ext = path.extname(file.name).toLowerCase();
    const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.log', '.txt', '.docx', '.xlsx', '.zip'];
    if (!allowed.includes(ext)) return NextResponse.json({ success: false, error: 'File type not allowed' }, { status: 400 });

    const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(attachDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    const meta = {
      id: String(Date.now()),
      refId, refType,
      filename,
      originalName: file.name,
      size: file.size,
      mimeType: file.type,
      uploadedBy,
      uploadedAt: new Date().toISOString(),
      url: `/api/attachments/${filename}`,
    };

    const data = readMeta();
    data.attachments.push(meta);
    fs.writeFileSync(metaPath, JSON.stringify(data, null, 2));

    return NextResponse.json({ success: true, attachment: meta });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  const data = readMeta();
  const att = data.attachments.find((a: any) => a.id === id);
  if (att) {
    const fp = path.join(attachDir, att.filename);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    data.attachments = data.attachments.filter((a: any) => a.id !== id);
    fs.writeFileSync(metaPath, JSON.stringify(data, null, 2));
  }
  return NextResponse.json({ success: true });
}
