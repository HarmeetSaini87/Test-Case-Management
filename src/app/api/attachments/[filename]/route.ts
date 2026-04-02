import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const attachDir = path.join(process.cwd(), 'dataHub', 'attachments');

export async function GET(
  req: Request,
  { params }: any
) {
  const { filename } = await params;
  const filePath = path.join(attachDir, filename);
  if (!fs.existsSync(filePath)) {
    return new NextResponse('Not found', { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.pdf': 'application/pdf', '.log': 'text/plain',
    '.txt': 'text/plain', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.zip': 'application/zip'
  };

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${filename}"`,
    },
  });
}
