"""Generate sample documents for BFAI Doc Intelligence demo."""
import os
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

OUT = os.path.join(os.path.dirname(__file__), "sample_docs")
os.makedirs(OUT, exist_ok=True)

styles = getSampleStyleSheet()

def h1(text):
    return Paragraph(text, ParagraphStyle('h1', parent=styles['Heading1'], fontSize=16, spaceAfter=10))

def h2(text):
    return Paragraph(text, ParagraphStyle('h2', parent=styles['Heading2'], fontSize=13, spaceAfter=6))

def body(text):
    return Paragraph(text, ParagraphStyle('body', parent=styles['Normal'], fontSize=10, spaceAfter=6, leading=14))

def sp(n=8):
    return Spacer(1, n)

def make_table(data, col_widths=None):
    t = Table(data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563EB')),
        ('TEXTCOLOR',  (0, 0), (-1, 0), colors.white),
        ('FONTNAME',   (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE',   (0, 0), (-1, 0), 9),
        ('FONTSIZE',   (0, 1), (-1, -1), 9),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('GRID',       (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('VALIGN',     (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING',   (0, 0), (-1, -1), 6),
    ]))
    return t


# ── 1. Invoice ────────────────────────────────────────────────────────────────
def create_invoice():
    path = os.path.join(OUT, "invoice_scan.pdf")
    doc = SimpleDocTemplate(path, pagesize=letter,
                            leftMargin=0.75*inch, rightMargin=0.75*inch,
                            topMargin=0.75*inch, bottomMargin=0.75*inch)
    story = []

    story.append(Paragraph("INVOICE", ParagraphStyle('inv', parent=styles['Title'], fontSize=28,
                                                       textColor=colors.HexColor('#2563EB'), spaceAfter=2)))
    story.append(body("<b>TechSolutions LLC</b>  |  123 Innovation Drive, San Francisco, CA 94102"))
    story.append(body("Email: billing@techsolutions.com  |  Tel: (415) 555-0100"))
    story.append(sp(12))

    meta = [
        ["Invoice No:", "INV-2024-0892",   "Invoice Date:", "October 15, 2024"],
        ["Bill To:",    "Acme Corp",        "Due Date:",     "November 15, 2024"],
        ["Address:",    "456 Commerce Ave", "PO Number:",    "PO-88421"],
        ["City/State:", "New York, NY 10001","Payment Terms:", "Net 30"],
    ]
    t = Table(meta, colWidths=[1.1*inch, 2.2*inch, 1.2*inch, 2.0*inch])
    t.setStyle(TableStyle([
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
        ('FONTNAME', (2,0), (2,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('VALIGN',   (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t)
    story.append(sp(14))

    story.append(h2("Line Items"))
    items = [
        ["#", "Description", "Qty", "Unit Price", "Amount"],
        ["1", "Cloud Infrastructure Setup (AWS)", "40 hrs", "$185.00", "$7,400.00"],
        ["2", "API Integration Services",          "16 hrs", "$175.00", "$2,800.00"],
        ["3", "Security Audit and Penetration Test","1 unit", "$2,500.00","$2,500.00"],
        ["4", "Technical Documentation",           "12 hrs",  "$95.00",  "$1,140.00"],
        ["5", "Post-Deployment Support (30 days)", "1 pkg",  "$1,500.00","$1,500.00"],
        ["6", "SSL Certificate (2-year)",          "1 unit",  "$148.00",  "$148.00"],
    ]
    story.append(make_table(items, col_widths=[0.35*inch, 2.9*inch, 0.75*inch, 1.0*inch, 1.0*inch]))
    story.append(sp(8))

    totals = [
        ["", "", "", "Subtotal:",  "$15,488.00"],
        ["", "", "", "Tax (3.7%):", "$572.86"],
        ["", "", "", "TOTAL DUE:", "$16,060.86"],
    ]
    t2 = Table(totals, colWidths=[0.35*inch, 2.9*inch, 0.75*inch, 1.0*inch, 1.0*inch])
    t2.setStyle(TableStyle([
        ('FONTNAME', (3, 0), (4, -1), 'Helvetica-Bold'),
        ('FONTNAME', (3, 2), (4, 2), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (3, 2), (4, 2), colors.HexColor('#2563EB')),
        ('LINEABOVE', (3, 2), (4, 2), 1.5, colors.HexColor('#2563EB')),
        ('ALIGN', (3, 0), (4, -1), 'RIGHT'),
    ]))
    story.append(t2)
    story.append(sp(20))

    story.append(body("<b>Payment Instructions:</b>"))
    story.append(body("Bank: First National Bank  |  Account: 8821-4479-0033  |  Routing: 021000021"))
    story.append(body("Please reference invoice number INV-2024-0892 with your payment."))
    story.append(sp(8))
    story.append(body("Late payments are subject to a 1.5% monthly finance charge. "
                      "Questions? Contact accounts@techsolutions.com"))

    doc.build(story)
    print(f"Created: {path}")


# ── 2. Financial Report ───────────────────────────────────────────────────────
def create_financial_report():
    path = os.path.join(OUT, "financial_report.pdf")
    doc = SimpleDocTemplate(path, pagesize=letter,
                            leftMargin=0.75*inch, rightMargin=0.75*inch,
                            topMargin=0.75*inch, bottomMargin=0.75*inch)
    story = []

    story.append(Paragraph("GlobalTech Industries, Inc.", ParagraphStyle(
        'corp', parent=styles['Title'], fontSize=22,
        textColor=colors.HexColor('#1E3A5F'), spaceAfter=2)))
    story.append(Paragraph("Q3 2024 Financial Report", ParagraphStyle(
        'sub', parent=styles['Heading2'], fontSize=15,
        textColor=colors.HexColor('#2563EB'), spaceAfter=2)))
    story.append(body("Period: July 1, 2024 - September 30, 2024  |  Confidential - For Internal Distribution"))
    story.append(sp(14))

    story.append(h2("Executive Summary"))
    story.append(body(
        "GlobalTech Industries delivered strong Q3 2024 results, achieving revenue of $127.4 million, "
        "representing a 23.7% year-over-year increase. EBITDA reached $31.2 million (24.5% margin), "
        "while net income grew 31% to $19.8 million. Cloud services continued as the primary growth "
        "driver, expanding 47% YoY, partially offset by modest declines in legacy hardware. "
        "The company raised FY2024 guidance to $495-510 million total revenue."
    ))
    story.append(sp(10))

    story.append(h2("Revenue by Business Segment (USD Millions)"))
    rev = [
        ["Segment",           "Q3 2024", "Q3 2023", "YoY Change", "YTD 2024"],
        ["Cloud Services",    "$58.2M",  "$39.7M",  "+47.0%",     "$162.1M"],
        ["Enterprise Software","$31.4M", "$27.9M",  "+12.5%",     "$91.3M"],
        ["Professional Services","$22.8M","$18.4M", "+23.9%",     "$64.9M"],
        ["Hardware & Devices","$15.0M",  "$16.9M",  "-11.2%",     "$43.7M"],
        ["<b>Total</b>",      "<b>$127.4M</b>","<b>$102.9M</b>","<b>+23.7%</b>","<b>$362.0M</b>"],
    ]
    story.append(make_table([[Paragraph(c, styles['Normal']) if '<b>' in c else c for c in row] for row in rev],
                             col_widths=[1.8*inch, 0.95*inch, 0.95*inch, 1.0*inch, 1.0*inch]))
    story.append(sp(12))

    story.append(h2("Key Financial Metrics"))
    metrics = [
        ["Metric",             "Q3 2024",  "Q2 2024",  "Q3 2023"],
        ["Gross Margin",       "47.2%",    "45.8%",    "43.1%"],
        ["EBITDA Margin",      "24.5%",    "22.9%",    "20.7%"],
        ["Net Income Margin",  "15.5%",    "14.2%",    "14.6%"],
        ["EPS (diluted)",      "$1.32",    "$1.19",    "$1.01"],
        ["Free Cash Flow",     "$23.1M",   "$19.4M",   "$16.7M"],
        ["R&D Spend",          "$14.2M",   "$13.8M",   "$11.9M"],
    ]
    story.append(make_table(metrics, col_widths=[1.8*inch, 1.1*inch, 1.1*inch, 1.1*inch]))
    story.append(sp(12))

    story.append(h2("Outlook & Guidance"))
    story.append(body(
        "Management raises FY2024 full-year revenue guidance to $495-510 million (previously $480-500M). "
        "Q4 2024 revenue expected at $133-137 million driven by seasonal enterprise software renewals "
        "and accelerating cloud migrations. EBITDA margin guidance maintained at 24-26% for full year. "
        "Capital expenditure planned at $18-22 million in Q4, primarily for data center expansion."
    ))

    doc.build(story)
    print(f"Created: {path}")


# ── 3. Research Paper ─────────────────────────────────────────────────────────
def create_research_paper():
    path = os.path.join(OUT, "research_paper.pdf")
    doc = SimpleDocTemplate(path, pagesize=letter,
                            leftMargin=0.75*inch, rightMargin=0.75*inch,
                            topMargin=0.75*inch, bottomMargin=0.75*inch)
    story = []

    story.append(Paragraph("Scaling Transformer Language Models: A Comprehensive Survey",
                            ParagraphStyle('title', parent=styles['Title'], fontSize=18,
                                           textColor=colors.HexColor('#1E3A5F'), spaceAfter=4)))
    story.append(Paragraph("Dr. Sarah Chen, Prof. Marcus Webb, Dr. Aiko Tanaka",
                            ParagraphStyle('authors', parent=styles['Normal'], fontSize=10,
                                           textColor=colors.grey, spaceAfter=2)))
    story.append(body("Stanford AI Lab - arXiv:2409.18821 - Submitted September 2024"))
    story.append(sp(12))

    story.append(h2("Abstract"))
    story.append(body(
        "We present a comprehensive survey of transformer language model scaling, analyzing 47 models "
        "ranging from 125M to 540B parameters trained on datasets from 100B to 15T tokens. "
        "Our analysis reveals consistent power-law relationships (L proportional to N^-0.076) between "
        "model size and cross-entropy loss, with emergent capabilities appearing at approximately 10B "
        "parameters for multi-step reasoning tasks. We identify three distinct scaling regimes and "
        "provide empirical guidelines for compute-optimal training. Our findings suggest diminishing "
        "returns beyond 175B parameters when training tokens scale proportionally."
    ))
    story.append(sp(10))

    story.append(h2("1. Introduction"))
    story.append(body(
        "The development of large language models (LLMs) has been marked by rapid parameter scaling "
        "from BERT's 340M (2018) to GPT-4's estimated 1.8T parameters (2023). Understanding the "
        "relationship between compute, data, model size, and downstream performance is critical for "
        "efficient resource allocation in both research and production contexts. Hoffmann et al. (2022) "
        "demonstrated that many existing large models were undertrained relative to optimal compute "
        "allocation - a finding confirmed across diverse model families in this survey."
    ))
    story.append(sp(10))

    story.append(h2("3. Benchmark Performance Comparison"))
    benchmarks = [
        ["Model",          "Params", "MMLU", "HumanEval", "GSM8K", "HellaSwag"],
        ["GPT-3",          "175B",   "43.9", "0.0",       "17.9",  "79.3"],
        ["PaLM",           "540B",   "62.9", "26.2",      "56.5",  "83.4"],
        ["LLaMA-2",        "70B",    "68.9", "29.9",      "56.8",  "87.3"],
        ["GPT-4",          "~1.8T",  "86.4", "67.0",      "92.0",  "95.3"],
        ["Claude-3 Opus",  "~2T",    "88.7", "84.9",      "95.0",  "95.4"],
        ["Gemini Ultra",   "~1.6T",  "90.0", "74.4",      "94.4",  "87.8"],
    ]
    story.append(make_table(benchmarks,
                             col_widths=[1.5*inch, 0.7*inch, 0.7*inch, 0.9*inch, 0.7*inch, 0.9*inch]))
    story.append(sp(8))
    story.append(body("Table 1: Performance across key benchmarks. MMLU = %, HumanEval = pass@1, GSM8K = %, HellaSwag = %."))
    story.append(sp(10))

    story.append(h2("5. Conclusions"))
    story.append(body(
        "Our analysis confirms that transformer language models follow predictable scaling laws across "
        "multiple orders of magnitude. Key conclusions: (1) Compute-optimal training requires "
        "approximately 20 training tokens per parameter. (2) Emergent capabilities arise non-linearly "
        "at approximately 10B parameters for complex reasoning. (3) RLHF alignment adds minimal "
        "performance cost while substantially improving safety. (4) Mixture-of-Experts architectures "
        "offer 3-5x compute savings at equivalent performance levels. Future work should investigate "
        "scaling laws for multimodal and code-specialized models."
    ))

    doc.build(story)
    print(f"Created: {path}")


# ── 4. Medical Record ─────────────────────────────────────────────────────────
def create_medical_record():
    path = os.path.join(OUT, "medical_record_sample.pdf")
    doc = SimpleDocTemplate(path, pagesize=letter,
                            leftMargin=0.75*inch, rightMargin=0.75*inch,
                            topMargin=0.75*inch, bottomMargin=0.75*inch)
    story = []

    story.append(Paragraph("CONFIDENTIAL MEDICAL RECORD", ParagraphStyle(
        'conf', parent=styles['Title'], fontSize=16,
        textColor=colors.HexColor('#DC2626'), spaceAfter=2)))
    story.append(body("City General Hospital  |  Patient Services Division"))
    story.append(sp(10))

    story.append(h2("Patient Information"))
    info = [
        ["Patient ID:", "MRN-20241015-7842", "DOB:", "March 12, 1978"],
        ["Name:", "John A. Smith (Fictional)", "Age:", "46 years"],
        ["Insurance:", "BlueCross Plan 4432", "Visit Date:", "October 15, 2024"],
        ["Physician:", "Dr. Emily Rodriguez, MD", "Dept:", "Internal Medicine"],
    ]
    t = Table(info, colWidths=[1.1*inch, 2.2*inch, 0.8*inch, 2.0*inch])
    t.setStyle(TableStyle([
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
        ('FONTNAME', (2,0), (2,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
    ]))
    story.append(t)
    story.append(sp(10))

    story.append(h2("Chief Complaint"))
    story.append(body("Patient presents with persistent fatigue for 6 weeks, shortness of breath on exertion, "
                      "and mild intermittent chest discomfort. Reports poor sleep quality and reduced exercise tolerance."))
    story.append(sp(8))

    story.append(h2("Vital Signs"))
    vitals = [
        ["Parameter",       "Value",      "Reference Range", "Status"],
        ["Blood Pressure",  "148/92 mmHg","<120/80 mmHg",    "ELEVATED"],
        ["Heart Rate",      "88 bpm",     "60-100 bpm",      "Normal"],
        ["Temperature",     "37.1 C",     "36.1-37.2 C",     "Normal"],
        ["O2 Saturation",   "96%",        ">95%",            "Normal"],
        ["BMI",             "29.4",       "18.5-24.9",       "Overweight"],
        ["Respiratory Rate","18/min",     "12-20/min",       "Normal"],
    ]
    story.append(make_table(vitals, col_widths=[1.4*inch, 1.2*inch, 1.4*inch, 1.0*inch]))
    story.append(sp(10))

    story.append(h2("Assessment and Plan"))
    story.append(body("<b>Primary Diagnosis:</b> Hypertension (I10) - Stage 2, newly diagnosed"))
    story.append(body("<b>Secondary:</b> Suspected obstructive sleep apnea - refer for polysomnography"))
    story.append(sp(4))
    story.append(body("<b>Plan:</b>"))
    for item in [
        "1. Start lisinopril 10mg daily. Follow-up BP check in 2 weeks.",
        "2. Order CBC, CMP, lipid panel, HbA1c, TSH.",
        "3. Chest X-ray and ECG to rule out cardiac cause of dyspnea.",
        "4. Dietary counseling referral - DASH diet guidance.",
        "5. Sleep study referral - Dr. Park, Sleep Medicine.",
        "6. Return in 4 weeks or sooner if symptoms worsen.",
    ]:
        story.append(body(item))

    story.append(sp(12))
    story.append(body("** FICTIONAL PATIENT DATA - FOR DEMONSTRATION PURPOSES ONLY **"))

    doc.build(story)
    print(f"Created: {path}")


# ── 5. Software License Contract ─────────────────────────────────────────────
def create_contract():
    path = os.path.join(OUT, "software_license_contract.pdf")
    doc = SimpleDocTemplate(path, pagesize=letter,
                            leftMargin=0.75*inch, rightMargin=0.75*inch,
                            topMargin=0.75*inch, bottomMargin=0.75*inch)
    story = []

    story.append(Paragraph("SOFTWARE LICENSE AND SERVICE AGREEMENT", ParagraphStyle(
        'ct', parent=styles['Title'], fontSize=16,
        textColor=colors.HexColor('#1E3A5F'), spaceAfter=4)))
    story.append(body("Agreement Reference: SLA-2024-1089  |  Effective Date: November 1, 2024"))
    story.append(sp(10))

    story.append(h2("Parties"))
    story.append(body("<b>Licensor:</b> TechSolutions LLC, 123 Innovation Drive, San Francisco, CA 94102"))
    story.append(body("<b>Licensee:</b> DataCorp Industries, 789 Enterprise Blvd, Austin, TX 78701"))
    story.append(sp(10))

    story.append(h2("1. License Grant"))
    story.append(body(
        "Licensor hereby grants Licensee a non-exclusive, non-transferable, worldwide license to use "
        "the DataSync Pro v4.0 software suite (\"Software\") for internal business purposes only. "
        "This license covers up to 500 named users and three production environments. "
        "Reproduction for backup and disaster recovery is permitted. Sublicensing is expressly prohibited."
    ))
    story.append(sp(8))

    story.append(h2("3. Service Level Agreement (SLA)"))
    sla = [
        ["Service",         "Availability", "Response Time", "Resolution Time"],
        ["Platform Uptime", "99.9% monthly","N/A",           "4 hours (critical)"],
        ["Critical Bugs",   "N/A",          "2 hours",       "24 hours"],
        ["High Priority",   "N/A",          "8 hours",       "72 hours"],
        ["Standard Issues", "N/A",          "24 hours",      "10 business days"],
        ["Feature Requests","N/A",          "5 business days","Roadmap review"],
    ]
    story.append(make_table(sla, col_widths=[1.5*inch, 1.1*inch, 1.1*inch, 1.4*inch]))
    story.append(sp(10))

    story.append(h2("4. Fees and Payment"))
    story.append(body(
        "Annual license fee: $84,000 USD (USD 7,000/month). Invoiced quarterly in advance. "
        "Professional Services: $195/hour (billed monthly). "
        "Fees increase by the lesser of 5% or CPI annually. Late payments accrue 1.5% monthly interest."
    ))
    story.append(sp(8))

    story.append(h2("7. Limitation of Liability"))
    story.append(body(
        "IN NO EVENT SHALL EITHER PARTY BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL "
        "DAMAGES. LICENSOR'S TOTAL LIABILITY SHALL NOT EXCEED FEES PAID IN THE PRIOR 12-MONTH PERIOD. "
        "These limitations shall not apply to breaches of confidentiality or intellectual property obligations."
    ))
    story.append(sp(8))

    story.append(h2("8. Term and Termination"))
    story.append(body(
        "Initial term: 3 years from Effective Date, auto-renewing annually unless 90-day written notice "
        "is provided. Either party may terminate for cause upon 30-day written notice if material breach "
        "remains uncured. Upon termination, Licensee shall destroy all copies of the Software."
    ))

    doc.build(story)
    print(f"Created: {path}")


# ── 6. Meeting Notes (TXT) ────────────────────────────────────────────────────
def create_meeting_notes():
    path = os.path.join(OUT, "meeting_notes.txt")
    content = """MEETING NOTES - Product Strategy Q4 2024
=========================================
Date: October 10, 2024
Time: 10:00 AM - 12:00 PM PST
Location: Conference Room B / Zoom Hybrid
Facilitator: Sarah Johnson (VP Product)

ATTENDEES
---------
- Sarah Johnson (VP Product)
- Marcus Chen (CTO)
- Lisa Patel (Head of Engineering)
- David Kim (Sales Director)
- Emma Torres (Customer Success Lead)
- Raj Gupta (Data Science Lead)
- Anita Williams (UX Lead)

AGENDA ITEMS & DISCUSSION
--------------------------

1. Q3 2024 Retrospective
   - Platform uptime: 99.94% (above 99.9% SLA target)
   - Monthly Active Users: 42,300 (up 18% QoQ)
   - NPS score improved from 34 to 47
   - 3 enterprise churn incidents (root cause: onboarding friction)
   - RESOLVED: Dedicated CSM assigned to enterprise accounts >$50K ARR

2. Q4 2024 Roadmap Priorities (Voted)
   a) AI Document Parser v2.0 [PRIORITY 1 - P0]
      - OCR for scanned docs (EasyOCR integration)
      - Table structure extraction
      - Multi-language support (Spanish, French, German)
      - Target: GA release December 15, 2024
   b) Advanced Search & Filtering [P1]
      - Semantic search across documents
      - Date range, document type, author filters
      - Target: Beta November 30, 2024
   c) API Rate Limiting Dashboard [P2]
      - Real-time usage visualization
      - Configurable alerts at 80%/100% thresholds
      - Target: December 1, 2024
   d) Mobile Responsive Redesign [P2]
      - iOS and Android browser optimization
      - Target: December 20, 2024

3. Enterprise Customer Feedback (Emma Torres)
   - Top request: Bulk document upload with progress tracking
   - Second request: PDF annotation / highlight export
   - Third request: SSO via SAML 2.0
   - 8/12 enterprise customers cited "upload experience" as friction point
   - ACTION: Schedule 5 customer interviews before sprint planning

4. Infrastructure Scaling (Lisa Patel)
   - Current: 8 x c5.2xlarge EC2 instances (auto-scaling group)
   - Q4 target: Upgrade to 12 x c5.4xlarge ahead of holiday traffic
   - ChromaDB vector store migration from single-node to distributed cluster
   - Estimated cost increase: $12,400/month (+22%)
   - Budget approved by CFO on October 8, 2024

5. Sales Pipeline Update (David Kim)
   - Q4 pipeline: $3.2M qualified opportunities
   - 4 deals >$200K in final negotiation
   - MegaBank Corp: $450K/yr deal, decision by October 31
   - GlobalRetail Inc: $280K/yr, pilot running through November 15
   - Win rate YTD: 34% (target 40%)

ACTION ITEMS
------------
1. [Lisa Patel] Submit infrastructure upgrade request to DevOps by Oct 14
2. [Raj Gupta]  Complete EasyOCR benchmark tests by Oct 18
3. [Anita Williams] Deliver bulk upload UX mockups by Oct 17
4. [Emma Torres] Schedule 5 enterprise customer interviews by Oct 20
5. [Sarah Johnson] Update roadmap in Jira and send to stakeholders by Oct 11
6. [Marcus Chen] Architecture review for distributed ChromaDB by Oct 25

NEXT MEETING: October 24, 2024, 10:00 AM PST - Sprint Planning
"""
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Created: {path}")


if __name__ == "__main__":
    print("Generating sample documents...")
    create_invoice()
    create_financial_report()
    create_research_paper()
    create_medical_record()
    create_contract()
    create_meeting_notes()
    print(f"\nDone! Files in: {OUT}")
    import os
    for f in os.listdir(OUT):
        fp = os.path.join(OUT, f)
        print(f"  {f} ({os.path.getsize(fp):,} bytes)")
