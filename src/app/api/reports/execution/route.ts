import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const execPath = path.join(process.cwd(), 'dataHub', 'executions.json');
const tcPath = path.join(process.cwd(), 'dataHub', 'testcases');

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function readExecutions() {
  if (!fs.existsSync(execPath)) return { executions: [] };
  return JSON.parse(fs.readFileSync(execPath, 'utf8'));
}

function readTestCase(id: string) {
  const p = path.join(tcPath, `${id}.json`);
  if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  return null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const suiteId = url.searchParams.get('suiteId');
    const format = url.searchParams.get('format') || 'html';

    if (!suiteId) return NextResponse.json({ error: 'suiteId is required' }, { status: 400 });

    const data = readExecutions();
    const execution = data.executions.find((e: any) => e.suiteId === suiteId);

    if (!execution) return NextResponse.json({ error: 'Execution not found' }, { status: 404 });

    // Enrich results with TC details
    const enrichedResults = execution.results.map((r: any) => {
      const tc = readTestCase(r.testCaseId);
      return { ...r, title: tc?.title || 'Unknown', priority: tc?.priority || 'Medium', module: tc?.module || 'Global' };
    });

    const stats = {
      total: enrichedResults.length,
      pass: enrichedResults.filter((r: any) => r.status === 'Pass').length,
      fail: enrichedResults.filter((r: any) => r.status === 'Fail').length,
      blocked: enrichedResults.filter((r: any) => r.status === 'Blocked').length,
      pending: enrichedResults.filter((r: any) => r.status === 'Pending').length,
    };

    const passRate = stats.total > 0 ? Math.round((stats.pass / stats.total) * 100) : 0;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Execution Report - ${execution.suiteName}</title>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          :root { --bg: #050511; --card: #0a0a1f; --border: rgba(255,255,255,0.08); --text: #ededed; --dim: rgba(255,255,255,0.4); --pass: #10b981; --fail: #ef4444; --accent: #3b82f6; }
          body { 
            font-family: 'Plus Jakarta Sans', sans-serif; 
            background-color: #050511 !important; 
            color: #ededed; 
            margin: 0; 
            padding: 0; 
            line-height: 1.5; 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .container { max-width: 1000px; margin: 40px auto; padding: 0 20px; background-color: #050511 !important; }
          .report-header { background-color: #0a0a1f !important; border: 1px solid var(--border); border-radius: 24px; padding: 40px; margin-bottom: 24px; position: relative; overflow: hidden; -webkit-print-color-adjust: exact !important; }
          .report-header::before { content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: var(--accent); }
          
          .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
          .title-area h1 { margin: 0; font-size: 32px; font-weight: 800; color: #fff; letter-spacing: -0.5px; }
          .meta-info { display: flex; gap: 24px; margin-top: 16px; font-size: 12px; color: var(--dim); font-weight: 500; }
          .meta-info span { display: flex; items-center: center; gap: 6px; }
          
          .score-circle { position: relative; width: 100px; height: 100px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 50%; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
          .score-val { font-size: 28px; font-weight: 800; color: #fff; line-height: 1; }
          .score-label { font-size: 9px; font-weight: 700; color: var(--dim); text-transform: uppercase; margin-top: 4px; }
          
          .metrics-row { margin-bottom: 32px; border: 1px solid var(--border); border-radius: 16px; overflow: hidden; background: rgba(255,255,255,0.02); }
          .metrics-table { width: 100%; border-collapse: collapse; }
          .metrics-table td { padding: 20px; text-align: center; border-right: 1px solid var(--border); width: 25%; }
          .metrics-table td:last-child { border-right: none; }
          .m-label { font-size: 10px; font-weight: 700; color: var(--dim); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
          .m-val { font-size: 28px; font-weight: 800; color: #fff; }
          
          .results-table { width: 100%; border-collapse: separate; border-spacing: 0; background: var(--card); border: 1px solid var(--border); border-radius: 24px; overflow: hidden; }
          .results-table th { background: rgba(255,255,255,0.03); padding: 16px 24px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--dim); letter-spacing: 1px; border-bottom: 1px solid var(--border); }
          .results-table td { padding: 20px 24px; border-bottom: 1px solid var(--border); font-size: 13px; vertical-align: top; }
          .results-table tr:last-child td { border-bottom: none; }
          
          .tc-id { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--accent); font-weight: 700; opacity: 0.8; }
          .tc-title { font-weight: 700; color: #fff; margin-bottom: 4px; }
          .tc-module { font-size: 11px; color: var(--dim); }
          
          .badge { padding: 6px 12px; border-radius: 10px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid transparent; }
          .badge-pass { background: rgba(16, 185, 129, 0.1); color: var(--pass); border-color: rgba(16, 185, 129, 0.2); }
          .badge-fail { background: rgba(239, 68, 68, 0.1); color: var(--fail); border-color: rgba(239, 68, 68, 0.2); }
          .badge-blocked { background: rgba(245, 158, 11, 0.1); color: #f59e0b; border-color: rgba(245, 158, 11, 0.2); }
          .badge-pending { background: rgba(255, 255, 255, 0.05); color: var(--dim); border-color: var(--border); }
          
          .comment-box { margin-top: 4px; font-size: 12px; color: var(--dim); line-height: 1.4; font-style: italic; max-width: 300px; }
          .priority-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 6px; }
          
          .footer { margin-top: 48px; text-align: center; font-size: 11px; color: var(--dim); letter-spacing: 1px; font-weight: 600; padding: 24px; opacity: 0.5; }
          
          @media print {
            body { background-color: #050511 !important; -webkit-print-color-adjust: exact !important; }
            .container { max-width: 100%; margin: 0; padding: 0; background-color: #050511 !important; }
            .report-header, .metrics-row, .results-table { box-shadow: none; background-color: #0a0a1f !important; -webkit-print-color-adjust: exact !important; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="report-header">
            <div class="header-top">
              <div class="title-area">
                <h1>${execution.suiteName}</h1>
                <div class="meta-info">
                  <span>Sprint: <b>${execution.sprint}</b></span>
                  <span>System: <b>PANAMAX TMS</b></span>
                  <span>Generated: <b>${new Date().toLocaleDateString()}</b></span>
                </div>
              </div>
              <div class="score-circle">
                <div class="score-val">${passRate}%</div>
                <div class="score-label">Success</div>
              </div>
            </div>

            <div class="metrics-row">
              <table class="metrics-table">
                <tr>
                  <td>
                    <div class="m-label">Total Tests</div>
                    <div class="m-val">${stats.total}</div>
                  </td>
                  <td>
                    <div class="m-label">Passed</div>
                    <div class="m-val" style="color: var(--pass)">${stats.pass}</div>
                  </td>
                  <td>
                    <div class="m-label">Failed</div>
                    <div class="m-val" style="color: var(--fail)">${stats.fail}</div>
                  </td>
                  <td>
                    <div class="m-label">Other</div>
                    <div class="m-val" style="color: #f59e0b">${stats.blocked}</div>
                  </td>
                </tr>
              </table>
            </div>
          </div>

          <table class="results-table">
            <thead>
              <tr>
                <th width="120">ID</th>
                <th>Test Case Narrative</th>
                <th width="100">Priority</th>
                <th width="120">Outcome</th>
              </tr>
            </thead>
            <tbody>
              ${enrichedResults.map((r: any) => `
                <tr>
                  <td><div class="tc-id">${r.testCaseId}</div></td>
                  <td>
                    <div class="tc-title">${r.title}</div>
                    <div class="tc-module">${r.module}</div>
                    ${r.comment ? `<div class="comment-box">${r.comment}</div>` : ''}
                  </td>
                  <td>
                    <div style="font-weight: 700; font-size: 11px; display: flex; align-items: center; color: var(--dim)">
                      <span class="priority-dot" style="background: ${r.priority === 'Highest' ? 'var(--fail)' : r.priority === 'High' ? '#f59e0b' : 'var(--accent)'}"></span>
                      ${r.priority}
                    </div>
                  </td>
                  <td>
                    <span class="badge badge-${r.status.toLowerCase()}">${r.status}</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            PANAMAX ENTERPRISE TEST MANAGEMENT SYSTEM
          </div>
        </div>
      </body>
      </html>
    `;

    if (format === 'pdf') {
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.setContent(htmlContent);
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
      });
      await browser.close();

      return new Response(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Report_${execution.suiteName.replace(/\s+/g, '_')}.pdf"`
        }
      });
    }

    // Default HTML
    return new Response(htmlContent, {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
