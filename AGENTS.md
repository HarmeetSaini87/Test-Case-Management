<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 🔴 STRICT INSTRUCTIONS FOR ALL AGENTS

## 1. 24/7 SERVICE MONITORING
- A Global Service Monitor is **ALWAYS ACTIVE** at `E:\AI Agent\bankai-service-monitor.ps1`.
- **CRITICAL RULE:** Do NOT terminate, kill, or modify this monitor. It is responsible for the self-healing of the Prod (4201) and Dev (4202) environments.
- If a service stops, the monitor will automatically restart it within 60 seconds. Do not panic and attempt manual restarts without checking `E:\AI Agent\bankai-service-monitor.log` first.

## 2. PRODUCTION SAFETY (BankaiProd)
- **NEVER** modify code or execute commands in the `BankaiProd` folder unless explicitly requested by the user for deployment.
- All development must happen in `e:\AI Agent\Bankai`.

## 3. PORT GOVERNANCE
- **PROD:** Must stay on `4201`.
- **DEV:** Must stay on `4202`.
- **PORT 3000 IS FORBIDDEN.** Do not attempt to bind any service to 3000.
