import { requireServerAuth } from '@/lib/auth/server-auth';
import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/auth/rate-limiter';

const UAMS_SYSTEM_PROMPT = `You are UAMS AI — the institutional intelligence advisor for the University Administration Management System (UAMS).
You assist students, faculty, heads of department, finance officers, and registrars.

Institutional Knowledge Base:
- Grading System (Standard 4.0 Scale):
  * A (70-100%): 4.0 GPA — Excellent
  * B (60-69%): 3.0 GPA — Good
  * C (50-59%): 2.0 GPA — Satisfactory
  * D (40-49%): 1.0 GPA — Pass
  * E (<40%): 0.0 GPA — Fail
- Exam Clearance Regulations:
  * Minimum 75% class attendance required across semester units.
  * 100% fee clearance (or official approved financial waiver) required to generate official Exam Clearance Cards with QR security tokens.
- Course Registration:
  * Standard full-time semester load: 18 - 24 credit hours (5 to 7 units).
  * Prerequisite units must be passed with Grade D or higher before enrolling in advanced modules.
- Accommodation & Facilities:
  * Hostel allocations are semester-bound and require room reservation clearing.
  * Digital Library loans standard duration is 14 days with automated fine calculation for overdue titles.
- Tone: Professional, encouraging, clear, and structured using clean markdown bullet points and bold headers.`;

export async function POST(request: Request) {
  const auth = await requireServerAuth(request);
  if ('errorResponse' in auth) return auth.errorResponse;
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    const rateLimit = checkRateLimit(`ai:${ip}`, 30, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `AI query rate limit reached. Please wait ${rateLimit.resetSeconds} seconds before sending another message.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { messages = [] } = body;
    const userRole = auth.user.role;
    const userName = auth.user.email;

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 30 || messages.some((m: any) => !m || !['user','assistant'].includes(m.role) || typeof m.content !== 'string' || m.content.length > 8000)) {
      return NextResponse.json(
        { success: false, error: 'At least one prompt message is required.' },
        { status: 400 }
      );
    }

    // Role-specific guardrail check before network call
    if (userRole === 'librarian') {
      const lastUserMsg = messages[messages.length - 1]?.content?.toLowerCase() || '';
      const asksToModifyGrades = (lastUserMsg.includes('grade') || lastUserMsg.includes('score') || lastUserMsg.includes('marks')) &&
        (lastUserMsg.includes('modify') || lastUserMsg.includes('change') || lastUserMsg.includes('edit') || lastUserMsg.includes('enter') || lastUserMsg.includes('update') || lastUserMsg.includes('override'));
      const asksFinancialLedger = (lastUserMsg.includes('financial ledger') || lastUserMsg.includes('disbursement') || lastUserMsg.includes('m-pesa') || lastUserMsg.includes('fee payment gateway') || lastUserMsg.includes('ledger details'));

      if (asksToModifyGrades || asksFinancialLedger) {
        return NextResponse.json({
          success: true,
          reply: `I'm sorry, but accessing or modifying grade/financial records is outside the operational scope of the University Librarian role.`,
          model: 'uams-guardrail-enforcer',
        });
      }
    }

    const apiKey = process.env.NVIDIA_API_KEY;
    const baseUrl = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
    const model = process.env.NVIDIA_MODEL || 'meta/llama-3.2-11b-vision-instruct';

    const getFallbackResponse = () => {
      let fallbackReply = `### UAMS Institutional Advisory\n\nI am currently experiencing higher than normal demand from the AI compute cluster. Here is standard institutional guidance:\n\n* **Exam Clearance**: Ensure your fees are 100% settled and attendance exceeds 75% to download your official clearance card.\n* **Academic Support**: For unit registration and credit transfers, please reach out directly to your Departmental HOD or Academic Registrar.\n* **Technical Portal Support**: Contact the ICT Directorate at \`ict@university.ac.ke\`.`;

      if (userRole === 'librarian') {
        fallbackReply = `### University Librarian Desk Advisory\n\nHere is operational guidance for library desk operations:\n\n* 📚 **Calculating Overdue Fines**: In accordance with institutional policy, late returns accrue fines at KES 50 per day up to the book maximum cap (KES 2,000).\n* 🔄 **Lost Book Replacement**: Student pays the standard replacement fee (KES 1,500) plus any accrued overdue penalty. Once settled with receipt reference, mark the loan resolved.\n* 🚫 **Exam Clearance Dependencies**: Under the active library policy (\`block_clearance_on_fines\`), students with overdue loans or unpaid penalties are automatically flagged as BLOCKED in the Exam Clearance module.\n* 📦 **Batch Catalogue Ingestion**: New textbook shipments can be imported in batches under the Library Desk catalogue tab.`;
      } else if (userRole === 'audit_officer') {
        fallbackReply = `### Institutional Compliance Advisory\n\n* **Audit Trail**: Every grade change, fee adjustment, and waiver grant requires a logged reason and timestamp.\n* **Clearance Overrides**: Financial waivers bypass fee clearance rules but cannot override attendance or disciplinary holds.\n* **Discrepancy Triage**: Review audit logs for high-frequency adjustments during exam registration periods.`;
      }

      return NextResponse.json({
        success: true,
        reply: fallbackReply,
        model: 'fallback-advisor',
      });
    };

    if (!apiKey) {
      return getFallbackResponse();
    }

    // Role-specific instruction overlay
    let roleInstruction = '';
    if (userRole === 'librarian') {
      roleInstruction = `\nYou are an AI assistant tailored for a University Librarian. Focus your guidance on library cataloging, loan policies, overdue fines, book circulation rules, and library-to-exam-clearance dependencies. Redirect questions about grading or financial ledgers to the appropriate department.\nStrict Guardrail: If the user asks to modify student grades or check financial ledger details outside their role scope, you MUST reply: "I'm sorry, but accessing or modifying grade/financial records is outside the operational scope of the University Librarian role."`;
    } else if (userRole === 'audit_officer') {
      roleInstruction = `\nYou are an AI assistant tailored for an Institutional Audit Officer. Focus your guidance on compliance checkpoints, fee overrides, audit trails, and risk anomaly detection.`;
    }

    const contextPrompt = `${UAMS_SYSTEM_PROMPT}\n\nCurrent User Context: Role: ${userRole.toUpperCase()}, Name: ${userName}. Tailor guidance specifically to their institutional privileges and operational scope.${roleInstruction}`;

    const formattedMessages = [
      { role: 'system', content: contextPrompt },
      ...messages.slice(-10).map((m: { role: string; content: string }) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content || ''),
      })),
    ];

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        temperature: 0.6,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('NVIDIA AI API returned error:', response.status, errorText);

      // Intelligent role-based fallback if upstream API is throttling
      let fallbackReply = `### UAMS Institutional Advisory\n\nI am currently experiencing higher than normal demand from the AI compute cluster. Here is standard institutional guidance:\n\n* **Exam Clearance**: Ensure your fees are 100% settled and attendance exceeds 75% to download your official clearance card.\n* **Academic Support**: For unit registration and credit transfers, please reach out directly to your Departmental HOD or Academic Registrar.\n* **Technical Portal Support**: Contact the ICT Directorate at \`ict@university.ac.ke\`.`;

      if (userRole === 'librarian') {
        fallbackReply = `### University Librarian Desk Advisory\n\nHere is operational guidance for library desk operations:\n\n* 📚 **Calculating Overdue Fines**: In accordance with institutional policy, late returns accrue fines at KES 50 per day up to the book maximum cap (KES 2,000).\n* 🔄 **Lost Book Replacement**: Student pays the standard replacement fee (KES 1,500) plus any accrued overdue penalty. Once settled with receipt reference, mark the loan resolved.\n* 🚫 **Exam Clearance Dependencies**: Under the active library policy (\`block_clearance_on_fines\`), students with overdue loans or unpaid penalties are automatically flagged as BLOCKED in the Exam Clearance module.\n* 📦 **Batch Catalogue Ingestion**: New textbook shipments can be imported in batches under the Library Desk catalogue tab.`;
      } else if (userRole === 'audit_officer') {
        fallbackReply = `### Institutional Compliance Advisory\n\n* **Audit Trail**: Every grade change, fee adjustment, and waiver grant requires a logged reason and timestamp.\n* **Clearance Overrides**: Financial waivers bypass fee clearance rules but cannot override attendance or disciplinary holds.\n* **Discrepancy Triage**: Review audit logs for high-frequency adjustments during exam registration periods.`;
      }

      return NextResponse.json({
        success: true,
        reply: fallbackReply,
        model: 'fallback-advisor',
      });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'No response generated by AI model.';

    return NextResponse.json({
      success: true,
      reply,
      model,
      usage: data.usage || null,
    });
  } catch (error: any) {
    console.error('AI chat endpoint exception:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal error processing AI query.',
      },
      { status: 500 }
    );
  }
}
