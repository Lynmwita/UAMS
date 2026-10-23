import subprocess
import os

html_content = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>UAMS - Full-Stack Architecture & CS Defense Master Guide</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

  @page {
    size: A4;
    margin: 12mm 14mm 14mm 14mm;
  }

  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  body {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #1e293b;
    background-color: #ffffff;
    line-height: 1.55;
    font-size: 9pt;
    margin: 0;
    padding: 0;
  }

  .header-card {
    background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #172554 100%);
    color: #ffffff;
    padding: 24px 26px;
    border-radius: 10px;
    margin-bottom: 20px;
    border-left: 6px solid #f59e0b;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .header-card h1 {
    margin: 0 0 6px 0;
    font-size: 20pt;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: #ffffff;
  }

  .header-card .subtitle {
    font-size: 11pt;
    color: #cbd5e1;
    font-weight: 400;
    margin-bottom: 12px;
  }

  .header-card .meta-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 10px;
  }

  .badge {
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 8pt;
    font-weight: 600;
    color: #f8fafc;
  }

  .badge.gold {
    background: #f59e0b;
    color: #0f172a;
    border: none;
    font-weight: 700;
  }

  h2 {
    color: #0f172a;
    font-size: 13pt;
    font-weight: 800;
    margin: 22px 0 10px 0;
    padding-bottom: 5px;
    border-bottom: 2px solid #e2e8f0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  h3 {
    color: #1e3a8a;
    font-size: 10.5pt;
    font-weight: 700;
    margin: 14px 0 6px 0;
  }

  p {
    margin: 0 0 8px 0;
    text-align: justify;
  }

  .analogy-box {
    background-color: #f8fafc;
    border: 1px solid #cbd5e1;
    border-left: 4px solid #3b82f6;
    padding: 10px 14px;
    border-radius: 6px;
    margin: 10px 0 14px 0;
    font-size: 8.8pt;
  }

  .analogy-box .title {
    font-weight: 700;
    color: #1d4ed8;
    margin-bottom: 4px;
    text-transform: uppercase;
    font-size: 7.8pt;
    letter-spacing: 0.5px;
  }

  .qa-card {
    background-color: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 14px;
    margin-bottom: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    page-break-inside: avoid;
  }

  .qa-question {
    font-weight: 700;
    color: #0f172a;
    font-size: 9.5pt;
    margin-bottom: 6px;
  }

  .qa-analogy {
    background-color: #fefce8;
    border: 1px solid #fef08a;
    padding: 6px 10px;
    border-radius: 5px;
    font-size: 8.3pt;
    color: #854d0e;
    margin-bottom: 6px;
  }

  .qa-answer {
    background-color: #f0fdf4;
    border-left: 3px solid #16a34a;
    padding: 8px 10px;
    font-size: 8.5pt;
    color: #14532d;
    margin-bottom: 6px;
  }

  .qa-trap {
    background-color: #fff1f2;
    border: 1px solid #fecdd3;
    padding: 6px 10px;
    border-radius: 5px;
    font-size: 8.2pt;
    color: #9f1239;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 14px 0;
    font-size: 8.2pt;
  }

  th, td {
    border: 1px solid #cbd5e1;
    padding: 6px 8px;
    text-align: left;
  }

  th {
    background-color: #0f172a;
    color: #ffffff;
    font-weight: 600;
  }

  tr:nth-child(even) {
    background-color: #f8fafc;
  }

  .code-snippet {
    background-color: #0f172a;
    color: #f8fafc;
    padding: 8px 12px;
    border-radius: 6px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 7.8pt;
    margin: 8px 0;
    overflow-x: auto;
  }

  .step-flow {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 10px 0;
  }

  .step-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 8px 12px;
    border-radius: 6px;
  }

  .step-num {
    background-color: #1e3a8a;
    color: #ffffff;
    font-weight: 800;
    font-size: 8pt;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    shrink: 0;
  }

  .step-content {
    flex-grow: 1;
  }

  .step-content strong {
    color: #0f172a;
  }

  .page-break {
    page-break-before: always;
  }

  .footer-note {
    margin-top: 20px;
    padding-top: 10px;
    border-top: 1px solid #e2e8f0;
    font-size: 7.5pt;
    color: #64748b;
    text-align: center;
  }
</style>
</head>
<body>

<div class="header-card">
  <h1>UAMS Full-Stack Architecture & CS Defense Master Guide</h1>
  <div class="subtitle">From Absolute First Principles to Advanced Engineering: Explaining Your University ERP Project to Your Academic Supervisor</div>
  <div class="meta-grid">
    <span class="badge gold">Project: UAMS</span>
    <span class="badge">Candidate Role: Lead Software Engineer</span>
    <span class="badge">Stack: Next.js 14/15 + Node.js Express + PostgreSQL (Supabase)</span>
    <span class="badge">Architecture: Decoupled 3-Tier Enterprise</span>
    <span class="badge">Security: OWASP Top 10 Compliant</span>
  </div>
</div>

<h2>1. Full-Stack Development from First Principles (The Zero-Jargon Foundation)</h2>
<p>If you have never built a full-stack system before, think of software as a <strong>High-End Restaurant</strong>. Every website on the planet operates exactly like this:</p>

<div class="step-flow">
  <div class="step-item">
    <div class="step-num">1</div>
    <div class="step-content">
      <strong>The Frontend (The Dining Table & The Menu):</strong><br/>
      This is everything the user sees and touches in their browser (Chrome, Safari). In UAMS, it is written in <em>React and Next.js</em>. Just like the customer reads the menu and presses a call button, a student types their admission number and clicks "Pay Fees via M-Pesa". The frontend does <strong>not</strong> have the bank money, and it cannot directly touch the database. It only creates a friendly visual interface.
    </div>
  </div>

  <div class="step-item">
    <div class="step-num">2</div>
    <div class="step-content">
      <strong>The API & HTTP Requests (The Waiter):</strong><br/>
      The waiter takes the customer's order to the kitchen. In web engineering, this order is called an <strong>HTTP Request</strong> (like <code>POST /api/v1/auth/login</code> or <code>GET /api/v1/grades</code>). The waiter brings back the food in a standard format called <strong>JSON</strong> (JavaScript Object Notation), which looks like formatted text with keys and values.
    </div>
  </div>

  <div class="step-item">
    <div class="step-num">3</div>
    <div class="step-content">
      <strong>The Backend (The Chef in the Kitchen):</strong><br/>
      Located in <code>backend/server.js</code> (Node.js & Express). The kitchen is private; customers are never allowed inside. The chef verifies if the requested dish is allowed, checks the recipe, enforces rules (e.g. <em>"Is this lecturer allowed to enter marks for this specific unit?"</em>), and prepares the meal.
    </div>
  </div>

  <div class="step-item">
    <div class="step-num">4</div>
    <div class="step-content">
      <strong>The Database (The Secure Pantry & Freezer):</strong><br/>
      Located in <strong>PostgreSQL (Supabase)</strong>. The pantry stores the raw ingredients (rows of student records, grades, passwords, fee transactions). Even the chef must follow strict pantry security rules (Row Level Security) when fetching or updating records.
    </div>
  </div>
</div>

<div class="analogy-box">
  <div class="title">Golden Software Engineering Rule to Quote to Your Supervisor</div>
  <strong>"Never Trust the Client" (Zero-Trust Presentation Layer):</strong> Anything running on the student's browser (HTML/JavaScript) can be manipulated using Developer Tools (F12). Therefore, authentic software engineers <em>never</em> rely on frontend checks alone. Every single rule, permission, calculation, and security boundary is enforced strictly on the <strong>Backend and Database layer</strong>.
</div>

<h2>2. Core Concepts You Must Explain Like an Expert</h2>

<table>
  <thead>
    <tr>
      <th style="width: 22%;">Technical Term</th>
      <th style="width: 35%;">The Simple Real-World Analogy</th>
      <th style="width: 43%;">What It Does in the UAMS Project</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>RBAC</strong><br/>(Role-Based Access Control)</td>
      <td><strong>Keycard Security Levels</strong> in a hospital: A patient can enter the waiting room, a nurse can enter patient rooms, but only surgeons can enter the operating theater.</td>
      <td>Partitions UAMS into 7 tiers: Super Admin, Admin, Registrar, HOD, Lecturer, Finance Officer, and Student. A student cannot see the grade submission button; a lecturer cannot view the financial bank ledgers.</td>
    </tr>
    <tr>
      <td><strong>JWT</strong><br/>(JSON Web Token)</td>
      <td><strong>A Stamped Wristband at a Festival:</strong> When you show your ID at the gate, security stamps your wrist. For the rest of the night, every stall checks the stamp instead of re-verifying your national ID.</td>
      <td>When a user signs in with correct credentials, the server cryptographically signs a digital token containing their <code>role</code> and <code>email</code>. On subsequent requests, the server verifies this signature in microseconds.</td>
    </tr>
    <tr>
      <td><strong>HttpOnly Cookie</strong> vs <strong>localStorage</strong></td>
      <td><strong>Lockbox behind the Hotel Desk</strong> vs <strong>Post-it Note on your Shirt:</strong> A post-it note can be snatched by any passerby (XSS virus). A lockbox can only be handled directly by the hotel staff.</td>
      <td>UAMS strictly stores authentication tokens inside <code>HttpOnly</code> cookies. Browser JavaScript cannot access <code>document.cookie</code>, completely eliminating cross-site scripting (XSS) token theft.</td>
    </tr>
    <tr>
      <td><strong>Password Hashing (scrypt)</strong> vs Encryption</td>
      <td><strong>A Meat Grinder</strong> vs <strong>A Safe:</strong> You can lock something in a safe and unlock it with a key (Encryption). But once you grind meat into sausage, you can never reconstruct the original cow (One-way Hash).</td>
      <td>UAMS never stores readable passwords. We use <code>scrypt</code> with cryptographic salts. Even if an attacker steals the entire database, they cannot reverse the hashes back into user passwords.</td>
    </tr>
    <tr>
      <td><strong>RLS</strong><br/>(Row Level Security)</td>
      <td><strong>Bank Safe Deposit Boxes:</strong> Even though all safety boxes are in the same vault, the bank only allows your key to open your specific drawer.</td>
      <td>A PostgreSQL security policy where the database engine itself rejects queries if a student attempts to fetch data belonging to another student ID.</td>
    </tr>
    <tr>
      <td><strong>Idempotency</strong></td>
      <td><strong>An Elevator Button:</strong> Pressing the floor 5 button once turns on the light. Pressing it 10 more times does not send 10 elevators or charge you 10 times.</td>
      <td>Critical for M-Pesa payments: If Safaricom sends the payment callback three times due to network retries, UAMS credits the student's fee ledger exactly once.</td>
    </tr>
  </tbody>
</table>

<div class="page-break"></div>

<h2>3. End-to-End Walkthrough of UAMS Workflows</h2>

<h3>Workflow A: Institutional Authentication & Session Issuance</h3>
<div class="step-flow">
  <div class="step-item">
    <div class="step-num">1</div>
    <div class="step-content"><strong>User Action:</strong> User navigates to <code>/login</code>, selects their role (e.g. <em>Registrar</em>), enters credentials, and clicks "Authenticate & Sign In".</div>
  </div>
  <div class="step-item">
    <div class="step-num">2</div>
    <div class="step-content"><strong>Rate Limiting Protection:</strong> The server checks the IP address against a sliding window rate limiter (max 10 attempts per minute) to stop credential stuffing attacks.</div>
  </div>
  <div class="step-item">
    <div class="step-num">3</div>
    <div class="step-content"><strong>Password Verification:</strong> Server runs <code>scrypt.verifyPassword()</code> with timing-safe comparison to prevent timing attacks.</div>
  </div>
  <div class="step-item">
    <div class="step-num">4</div>
    <div class="step-content"><strong>Token Generation & Cookie Dispatch:</strong> The backend signs a JWT payload with HMAC-SHA256 using the 64-character secret key. It issues an <code>HttpOnly</code> cookie with <code>SameSite=Strict</code>.</div>
  </div>
  <div class="step-item">
    <div class="step-num">5</div>
    <div class="step-content"><strong>Role Redirect:</strong> Next.js reads the user role and automatically directs them to their customized workspace (e.g., <code>/dashboard/registrar</code>).</div>
  </div>
</div>

<h3>Workflow B: Semester Grading & Senate Approval Pipeline</h3>
<div class="step-flow">
  <div class="step-item">
    <div class="step-num">1</div>
    <div class="step-content"><strong>Lecturer Mark Entry:</strong> The Lecturer opens <code>/dashboard/grades</code>, selects their course unit (e.g., <em>BCS 311: Advanced Database Systems</em>), and inputs CAT marks (out of 30) and Exam marks (out of 70).</div>
  </div>
  <div class="step-item">
    <div class="step-num">2</div>
    <div class="step-content"><strong>Institutional Policy Calculation:</strong> The system invokes the <code>institutionalPolicy.ts</code> engine to compute weighted total scores, assign letter grades (A, B, C, D, E), and grade points (4.0 scale).</div>
  </div>
  <div class="step-item">
    <div class="step-num">3</div>
    <div class="step-content"><strong>Departmental Verification (HOD):</strong> The Head of Department reviews the class grade distribution, checks for anomalies, and signs off.</div>
  </div>
  <div class="step-item">
    <div class="step-num">4</div>
    <div class="step-content"><strong>Senate Approval & Publishing (Registrar):</strong> The Registrar receives departmental grade sheets, validates Senate compliance, and marks the grades as <em>"Approved"</em>. Once approved, the record is locked against further editing.</div>
  </div>
  <div class="step-item">
    <div class="step-num">5</div>
    <div class="step-content"><strong>Student Transcript Access:</strong> The student logs into <code>/dashboard/grades</code> and generates their verified PDF Semester Transcript with institutional watermark.</div>
  </div>
</div>

<h3>Workflow C: M-Pesa Fee Settlement & Exam Clearance Card</h3>
<div class="step-flow">
  <div class="step-item">
    <div class="step-num">1</div>
    <div class="step-content"><strong>STK Push Request:</strong> The Student navigates to <code>/dashboard/finance</code>, enters their Kenyan mobile number (<code>07...</code> or <code>254...</code>) and tuition amount, and clicks "Pay with M-Pesa".</div>
  </div>
  <div class="step-item">
    <div class="step-num">2</div>
    <div class="step-content"><strong>Safaricom Daraja Integration:</strong> The system formats the payload to international standard <code>254XXXXXXXXX</code>, creates a Base64 timestamp passkey, and calls the Safaricom Daraja API. A PIN prompt appears instantly on the student's handset.</div>
  </div>
  <div class="step-item">
    <div class="step-num">3</div>
    <div class="step-content"><strong>Asynchronous Webhook Callback:</strong> When the student enters their PIN, Safaricom sends a JSON payload to our callback URL <code>/api/v1/finance/mpesa/callback</code>.</div>
  </div>
  <div class="step-item">
    <div class="step-num">4</div>
    <div class="step-content"><strong>Idempotent Ledger Settlement:</strong> The server checks the <code>MpesaReceiptNumber</code>. If fresh, it inserts a credit record into the university ledger and sets the student balance to zero.</div>
  </div>
  <div class="step-item">
    <div class="step-num">5</div>
    <div class="step-content"><strong>Automated Exam Card Clearance:</strong> The Exam Clearance Engine evaluates: (1) Fee balance is $\le$ threshold, and (2) Class attendance is $\ge 75\%$. If cleared, the student is permitted to download their official QR-coded <strong>Examination Card</strong>.</div>
  </div>
</div>

<div class="page-break"></div>

<h2>4. The Academic Defense: Top 12 Tough Supervisor Quizzes & Exact Answers</h2>

<div class="qa-card">
  <div class="qa-question">Q1: "Explain your system architecture. Why didn't you just write a monolithic app?"</div>
  <div class="qa-analogy"><strong>How to think about it:</strong> Don't put the cash register, the cooking stove, and the bank vault in the same room. Separate them so if one breaks, the others survive.</div>
  <div class="qa-answer"><strong>Say this to supervisor:</strong> "We engineered UAMS on a decoupled 3-tier architecture: Next.js (TypeScript) for high-performance server-side rendering and client interface, a dedicated Express Node.js API server for business validation and integration services, and PostgreSQL for relational persistence. Decoupling ensures separation of concerns, enables horizontal microservice scaling, and guarantees that sensitive database connections are never exposed to client-side runtimes."</div>
  <div class="qa-trap"><strong>Trap to avoid:</strong> Don't say "Because Next.js was cool." Supervisors hate trend-chasing; they want architectural justification like scalability, security, and separation of concerns.</div>
</div>

<div class="qa-card">
  <div class="qa-question">Q2: "How did you implement security? What stops a student from hacking their grades?"</div>
  <div class="qa-analogy"><strong>How to think about it:</strong> The student might alter the grade number on their screen using inspect element, but the server will laugh at them because the server only trusts its own database.</div>
  <div class="qa-answer"><strong>Say this to supervisor:</strong> "Security is enforced using Defense-in-Depth following OWASP standards: (1) Authentication uses salted <code>scrypt</code> hashing with timing-safe comparisons; (2) Session management uses cryptographically signed JWTs stored exclusively in <code>HttpOnly</code> cookies with zero <code>localStorage</code> usage to eliminate XSS token exfiltration; (3) Every API route verifies role permissions with server-side RBAC guards; and (4) The database layer enforces PostgreSQL Row-Level Security (RLS) so unauthorized SQL mutations are rejected at the database engine level."</div>
  <div class="qa-trap"><strong>Trap to avoid:</strong> Never say "We hid the button on the frontend." Hiding buttons is NOT security; anyone can send a POST request with Postman or Curl.</div>
</div>

<div class="qa-card">
  <div class="qa-question">Q3: "What database did you use, and how is your schema normalized?"</div>
  <div class="qa-analogy"><strong>How to think about it:</strong> Normalization means we don't repeat data. If a student's phone number changes, we update it in 1 place, not in 50 grade rows.</div>
  <div class="qa-answer"><strong>Say this to supervisor:</strong> "We utilized PostgreSQL configured in Third Normal Form (3NF). We separated entities into dedicated relational tables: <code>users</code>, <code>students</code>, <code>schools</code>, <code>departments</code>, <code>courses</code>, <code>enrollments</code>, <code>grades</code>, <code>fee_ledger</code>, and <code>audit_logs</code>. We enforce referential integrity with foreign key constraints, cascading rules, and UUID primary keys to prevent sequential ID harvesting attacks."</div>
  <div class="qa-trap"><strong>Trap to avoid:</strong> Don't say "We stored everything in JSON." That defeats the purpose of a relational database. Mention foreign keys, indexes, and constraints.</div>
</div>

<div class="qa-card">
  <div class="qa-question">Q4: "What happens if Safaricom sends an M-Pesa payment callback two or three times?"</div>
  <div class="qa-analogy"><strong>How to think about it:</strong> If a delivery driver rings your doorbell twice with the same package, you don't pay twice or accept two boxes.</div>
  <div class="qa-answer"><strong>Say this to supervisor:</strong> "We engineered our M-Pesa webhook handler with strict <em>idempotency</em>. When Safaricom transmits a transaction callback, we extract the unique <code>MpesaReceiptNumber</code> and check our database transaction cache. If the receipt has already been processed, the system logs a duplicate webhook notice and returns HTTP 200 without re-crediting the student balance."</div>
  <div class="qa-trap"><strong>Trap to avoid:</strong> Saying "That never happens." Telco webhooks retry frequently due to latency. Showing you handled idempotency earns maximum engineering points.</div>
</div>

<div class="qa-card">
  <div class="qa-question">Q5: "Why did you build an Institutional Policy Engine instead of hardcoding grade boundaries?"</div>
  <div class="qa-analogy"><strong>How to think about it:</strong> If the university senate decides next semester that CATs are 40% instead of 30%, a bad programmer has to rewrite 500 lines of code. A good engineer changes 1 config file.</div>
  <div class="qa-answer"><strong>Say this to supervisor:</strong> "In enterprise academic ERPs, policies evolve. Different faculties or programs require different assessment weights (e.g. 30/70 for theory vs 40/60 for lab-intensive courses) and different attendance thresholds (e.g. 75% rule). We encapsulated this in an <code>Institutional Policy Engine</code> (<code>institutionalPolicy.ts</code>) so grading criteria, GPA thresholds, and exam clearance rules are configurable parameters rather than rigid, brittle constants."</div>
  <div class="qa-trap"><strong>Trap to avoid:</strong> Admitting you hardcoded values. Emphasize that your system was specifically refactored to align with supervisor recommendations.</div>
</div>

<div class="qa-card">
  <div class="qa-question">Q6: "How does the rotating QR code attendance prevent cheating (proxy attendance)?"</div>
  <div class="qa-analogy"><strong>How to think about it:</strong> Google Authenticator changes numbers every 30 seconds. A screenshot taken 2 minutes ago is completely useless.</div>
  <div class="qa-answer"><strong>Say this to supervisor:</strong> "Traditional paper roll-calls or static QR codes suffer from proxy attendance where students photograph the code and share it on WhatsApp. Our dynamic attendance projector regenerates QR codes every 15 seconds embedded with a time-bound HMAC cryptographic nonce. A student must physically be in the lecture hall to scan it before the nonce expires."</div>
  <div class="qa-trap"><strong>Trap to avoid:</strong> Calling it a regular QR code. Emphasize that it is dynamic, ephemeral, and cryptographically signed.</div>
</div>

<div class="page-break"></div>

<div class="qa-card">
  <div class="qa-question">Q7: "What is the difference between Authentication and Authorization?"</div>
  <div class="qa-analogy"><strong>How to think about it:</strong> Authentication is showing your passport at border control (proving WHO you are). Authorization is whether you have a work visa to enter the country (what you are ALLOWED to do).</div>
  <div class="qa-answer"><strong>Say this to supervisor:</strong> "Authentication verifies identity: <em>'Are you Dr. Kimani?'</em> (handled via email, salted scrypt password hashing, and MFA TOTP tokens). Authorization verifies permissions: <em>'Can Dr. Kimani approve Senate transcripts?'</em> (handled via our RBAC matrix in <code>rbac.ts</code>, which determines that only the Registrar has the <code>grades:approve</code> permission)."</div>
  <div class="qa-trap"><strong>Trap to avoid:</strong> Mixing up the two terms. This is the most common theoretical test examiners use to weed out students.</div>
</div>

<div class="qa-card">
  <div class="qa-question">Q8: "Why did you choose scrypt over basic MD5 or SHA-256 for passwords?"</div>
  <div class="qa-analogy"><strong>How to think about it:</strong> SHA-256 is a sports car (super fast). That's great for checksums, but terrible for passwords because a hacker can test 10 billion passwords per second on a GPU. Scrypt is heavy sand that slows down the hacker.</div>
  <div class="qa-answer"><strong>Say this to supervisor:</strong> "MD5 and SHA-256 are fast hash functions designed for data integrity, making them vulnerable to modern GPU and ASIC rainbow-table attacks. <code>scrypt</code> is a memory-hard key derivation function. By tuning CPU and memory cost parameters (<code>N=16384, r=8, p=1</code>), it makes hardware-accelerated brute-force attacks computationally and financially prohibitive."</div>
  <div class="qa-trap"><strong>Trap to avoid:</strong> Saying "SHA-256 is secure enough for passwords." In 2026, raw SHA-256 without key stretching is considered an OWASP security violation.</div>
</div>

<div class="qa-card">
  <div class="qa-question">Q9: "How do you handle concurrent hostel bed bookings without double-booking?"</div>
  <div class="qa-analogy"><strong>How to think about it:</strong> If two people grab the last carton of milk at the supermarket at the exact same second, the barcode scanner can only register one sale.</div>
  <div class="qa-answer"><strong>Say this to supervisor:</strong> "In the database, room inventory is governed by transactional ACID guarantees. We utilize PostgreSQL row locks (<code>SELECT ... FOR UPDATE</code>) or conditional constraints (<code>allocated_beds < capacity</code>) during the reservation transaction. If two students submit a booking request simultaneously, the first transaction commits and increments occupancy, causing the second to fail validation and receive a 409 Conflict."</div>
  <div class="qa-trap"><strong>Trap to avoid:</strong> Thinking JavaScript variables handle concurrency. Concurrency MUST be handled at the database transaction layer.</div>
</div>

<div class="qa-card">
  <div class="qa-question">Q10: "What is your testing strategy? How do we know your code works?"</div>
  <div class="qa-analogy"><strong>How to think about it:</strong> Before flying an airplane, engineers test the engines in a wind tunnel, not with passengers on board.</div>
  <div class="qa-answer"><strong>Say this to supervisor:</strong> "We built an automated test suite with over 30 unit and integration tests using Node's native test runner and TypeScript (<code>npm run test</code>). We test: (1) GPA calculation and Senate academic honors classification; (2) Exam clearance thresholds under varying fee balances; (3) M-Pesa STK payload formatting; (4) Cryptographic token forgery rejection; and (5) Token replay attack containment."</div>
  <div class="qa-trap"><strong>Trap to avoid:</strong> Saying "I tested it manually by clicking around." Automated tests prove you wrote rigorous software.</div>
</div>

<div class="qa-card">
  <div class="qa-question">Q11: "What role does AI play in this project, and how is it integrated?"</div>
  <div class="qa-analogy"><strong>How to think about it:</strong> Instead of having human academic advisors answer the same questions about prerequisites 500 times a day, the AI acts as an instant 24/7 university guide.</div>
  <div class="qa-answer"><strong>Say this to supervisor:</strong> "We integrated an Institutional AI Academic Advisor powered by NVIDIA NIM (<code>meta/llama-3.2-11b-vision-instruct</code>). Connected via our secure server route <code>/api/v1/ai/chat</code>, it acts as a digital advisor for students querying course prerequisites, academic policies, degree regulations, and graduation criteria, without exposing private student records to public LLM endpoints."</div>
  <div class="qa-trap"><strong>Trap to avoid:</strong> Don't claim the AI grading student exams. That raises ethical concerns. Emphasize that it is an academic guidance advisor.</div>
</div>

<div class="qa-card">
  <div class="qa-question">Q12: "If this system is deployed to 30,000 students on exam day, how does it scale?"</div>
  <div class="qa-analogy"><strong>How to think about it:</strong> Instead of one person answering 30,000 phone calls, you hire 10 call center reps and put the frequently asked questions on a giant billboard (caching).</div>
  <div class="qa-answer"><strong>Say this to supervisor:</strong> "Our decoupled architecture scales horizontally: (1) Next.js static assets and SSR pages can be distributed globally across Vercel Edge CDNs; (2) The Node.js Express backend can run in containerized Docker pods managed by Kubernetes behind a load balancer; (3) PostgreSQL connection pooling (via Supabase PgBouncer) prevents database exhaustion during traffic spikes; and (4) Static course catalog queries are cached to minimize direct database reads."</div>
  <div class="qa-trap"><strong>Trap to avoid:</strong> Saying "We will just buy a bigger server." Cloud software scales horizontally (more instances), not just vertically.</div>
</div>

<div class="page-break"></div>

<h2>5. The Live Defense Walkthrough Script (Click-by-Click)</h2>

<p>When presenting live, sit confidently, open your laptop, and follow this exact demonstration narrative:</p>

<table>
  <thead>
    <tr>
      <th style="width: 15%;">Phase</th>
      <th style="width: 35%;">What You Click on the Screen</th>
      <th style="width: 50%;">What You Say Out Loud to the Supervisor</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Phase 1: Architecture</strong></td>
      <td>Open browser at <code>http://localhost:3000</code>.</td>
      <td><em>"Good morning, Professor. This is the University Administration Management System. As you can see, the application is responsive, adhering to institutional branding. Behind this is our decoupled Next.js and Express Node.js architecture with PostgreSQL."</em></td>
    </tr>
    <tr>
      <td><strong>Phase 2: Security & Login</strong></td>
      <td>Click <strong>Sign In</strong> to go to <code>/login</code>. Click the <strong>Student (Faith Wanjiku)</strong> demo button. Click <strong>Authenticate & Sign In</strong>.</td>
      <td><em>"Notice our authentication model. In compliance with your feedback, passwords are never stored in plaintext—we use salted scrypt hashing. The session token is transmitted in an HttpOnly cookie with SameSite protection, eliminating localStorage XSS vulnerabilities."</em></td>
    </tr>
    <tr>
      <td><strong>Phase 3: Student Clearance</strong></td>
      <td>Navigate to <strong>Exam Clearance & Cards</strong> (<code>/dashboard/exams</code>).</td>
      <td><em>"Here is the student portal. If the student attempts to generate their Exam Card, our Institutional Policy Engine checks whether they have met both the 100% fee threshold and 75% attendance threshold. If uncleared, the card is locked with clear policy guidance."</em></td>
    </tr>
    <tr>
      <td><strong>Phase 4: M-Pesa Finance</strong></td>
      <td>Navigate to <strong>Fees & Finance</strong> (<code>/dashboard/finance</code>). Initiate a simulated M-Pesa payment.</td>
      <td><em>"To clear arrears, students initiate real-time payments through our Safaricom Daraja integration. We engineered the webhook callback with strict idempotency so duplicate network retries never double-credit the student ledger."</em></td>
    </tr>
    <tr>
      <td><strong>Phase 5: Lecturer Grading</strong></td>
      <td>Log out. Click <strong>Lecturer</strong> demo button and log in. Navigate to <strong>Examinations & Grades</strong> (<code>/dashboard/grades</code>).</td>
      <td><em>"Now I have logged in as Faculty. Notice that the navigation dynamically adapts based on RBAC. The lecturer enters Continuous Assessment (30%) and Final Exam (70%) marks. Our GPA engine automatically computes weighted credit averages."</em></td>
    </tr>
    <tr>
      <td><strong>Phase 6: Senate Approval</strong></td>
      <td>Log out. Click <strong>Registrar</strong> demo button and log in. Show the approval workflow.</td>
      <td><em>"The Registrar has final Senate authority. Once verified, the Registrar executes Senate approval, permanently locking the marks from unauthorized tampering and generating verified institutional transcripts."</em></td>
    </tr>
    <tr>
      <td><strong>Phase 7: AI Advisor & Audit Logs</strong></td>
      <td>Log in as <strong>Super Admin</strong>. Show <strong>AI Advisor</strong> (<code>/dashboard/ai</code>) and <strong>Audit Logs</strong> (<code>/dashboard/audit</code>).</td>
      <td><em>"Finally, as Super Admin, we have our AI Institutional Advisor powered by NVIDIA NIM for academic guidance, and our immutable Audit Trail where every financial and academic transaction is recorded for compliance."</em></td>
    </tr>
  </tbody>
</table>

<div class="footer-note">
  University Administration Management System (UAMS) • Computer Science Final Project Defense Guide • Prepared for Institutional Review
</div>

</body>
</html>
"""

html_path = "/home/lynnaz/projects/Nextjs/uams/docs/UAMS_FullStack_CS_Defense_Guide.html"
pdf_path = "/home/lynnaz/projects/Nextjs/uams/docs/UAMS_FullStack_CS_Defense_Guide.pdf"
desktop_pdf = "/home/lynnaz/Desktop/UAMS_FullStack_CS_Defense_Guide.pdf"

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"Wrote HTML to {html_path}")

cmd = [
    "google-chrome",
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--no-pdf-header-footer",
    f"--print-to-pdf={pdf_path}",
    html_path
]

res = subprocess.run(cmd, capture_output=True, text=True)
if res.returncode == 0:
    print(f"Successfully generated PDF: {pdf_path}")
    subprocess.run(["cp", pdf_path, desktop_pdf])
    print(f"Copied to Desktop: {desktop_pdf}")
else:
    print("Chrome error:", res.stderr)
