"""Build the ExamAI SGP report DOCX + PDF in AutoVerse reference style.

Run from the repository root:
    backend/venv/bin/python "SGP Report/build_examai_report.py"

Outputs (in SGP Report/):
    ExamAI_SGP_Report.docx      - full editable report (recreated frontmatter + body)
    ExamAI_SGP_Report_body.pdf  - body PDF starting at Abstract (for merging)
    ExamAI_SGP_Report.pdf       - final PDF = Frontmatter 1.0.pdf (9 pp verbatim) + body PDF

Style ground truth: SGP Report/Reference/AutoVerse_Final_Project_Report.pdf
  Letter 612x792, Calibri, body 11, H1 17 bold, H2 13 bold, H3 11.5 bold,
  caption 9.5 bold centered, header IITE/CSE2026/ExamAI, footer dept + page no.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DRAFT = ROOT / "Report Draft"
FIGDIR = DRAFT  # image paths in md are relative to Report Draft/
FRONT_PDF = DRAFT / "Frontmatter 1.0.pdf"
OUT_DOCX = ROOT / "ExamAI_SGP_Report.docx"
OUT_BODY_PDF = ROOT / "ExamAI_SGP_Report_body.pdf"
OUT_FINAL_PDF = ROOT / "ExamAI_SGP_Report.pdf"

HEADER_LEFT = "IITE/CSE2026/ExamAI"
FOOTER_LEFT = "Department of Computer Science And Engineering"

CHAPTERS = [
    ("Chapter 01 - Introduction.md", "CHAPTER 1   INTRODUCTION"),
    ("Chapter 02 - Literature Survey.md", "CHAPTER 2   LITERATURE SURVEY"),
    ("Chapter 03 - Project Management.md", "CHAPTER 3   PROJECT MANAGEMENT"),
    ("Chapter 04 - System Requirements.md", "CHAPTER 4   SYSTEM REQUIREMENTS"),
    ("Chapter 05 - System Analysis.md", "CHAPTER 5   SYSTEM ANALYSIS"),
    ("Chapter 06 - Testing.md", "CHAPTER 6   TESTING"),
    ("Chapter 07 - System Design.md", "CHAPTER 7   SYSTEM DESIGN"),
    ("Chapter 08 - Result and Discussion.md", "CHAPTER 8   RESULT AND DISCUSSION"),
    ("Chapter 09 - Limitation and Future Enhancement.md",
     "CHAPTER 9   LIMITATION AND FUTURE ENHANCEMENT"),
    ("Chapter 10 - Conclusion.md", "CHAPTER 10   CONCLUSION"),
    ("Chapter 11 - Appendices.md", "CHAPTER 11   APPENDICES"),
]

# ---------------------------------------------------------------- MD parsing
IMG_RE = re.compile(r"!\[(.*?)\]\((.*?)\)")


def parse_md(path: Path):
    """Parse draft markdown into a list of blocks.

    Block = tuple(kind, payload):
      h1 str | h2 str | h3 str | para str | bullet str
      table (headers, rows, caption_or_None) | figure (alt, relpath)
      caption str (Table X... standalone, attached by caller)
    """
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    blocks: list[tuple] = []
    i = 0
    pending_table = None  # (headers, rows) awaiting caption line

    def flush_pending_as_table():
        nonlocal pending_table
        if pending_table is not None:
            blocks.append(("table", (*pending_table, None)))
            pending_table = None

    while i < len(lines):
        raw = lines[i]
        s = raw.strip()
        if not s:
            i += 1
            continue
        if s.startswith(">"):
            i += 1
            continue  # draft authoring notes, not report content
        if s.startswith("#### "):
            flush_pending_as_table()
            blocks.append(("h3", s[5:].strip()))
            i += 1
            continue
        if s.startswith("### "):
            flush_pending_as_table()
            blocks.append(("h3", s[4:].strip()))
            i += 1
            continue
        if s.startswith("## "):
            flush_pending_as_table()
            blocks.append(("h2", s[3:].strip()))
            i += 1
            continue
        if s.startswith("# "):
            flush_pending_as_table()
            blocks.append(("h1", s[2:].strip()))
            i += 1
            continue
        m = IMG_RE.search(s)
        if m and s.startswith("!["):
            flush_pending_as_table()
            blocks.append(("figure", (m.group(1).strip(), m.group(2).strip())))
            i += 1
            continue
        if s.startswith("|"):
            # collect contiguous table lines
            tbl = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                tbl.append(lines[i].strip())
                i += 1
            # skip separator row(s)
            data = [r for r in tbl
                    if not re.match(r"^\|[\s:\-|]+\|$", r)]
            if len(data) >= 2:
                split = lambda r: [c.strip() for c in r.strip("|").split("|")]
                headers, rows = split(data[0]), [split(r) for r in data[1:]]
                pending_table = (headers, rows)
            continue
        if re.match(r"^Table\s+[\d.]+:", s):
            if pending_table is not None:
                blocks.append(("table", (*pending_table, s.strip())))
                pending_table = None
            else:
                blocks.append(("caption", s.strip()))
            i += 1
            continue
        if s.startswith(("- ", "* ")):
            flush_pending_as_table()
            blocks.append(("bullet", s[2:].strip()))
            i += 1
            continue
        # numbered "1. text" bibliography entries etc -> keep as bullet-ish para
        if re.match(r"^\d+\.\s", s):
            flush_pending_as_table()
            blocks.append(("bullet", s))
            i += 1
            continue
        # plain paragraph: join following plain lines
        flush_pending_as_table()
        para = [s]
        i += 1
        while i < len(lines):
            nxt = lines[i].strip()
            if not nxt or nxt.startswith(("#", "|", "![", "- ", "* ", ">")) \
                    or re.match(r"^Table\s+[\d.]+:", nxt) \
                    or re.match(r"^\d+\.\s", nxt):
                break
            para.append(nxt)
            i += 1
        blocks.append(("para", " ".join(para)))
    flush_pending_as_table()
    return blocks


def parse_front_matter():
    fm = parse_md(DRAFT / "Chapter 00 - Front Matter.md")
    abstract, lof, lot, abbr = [], None, None, []
    section = None
    for kind, pay in fm:
        if kind in ("h1", "h2"):
            section = pay.lower()
            continue
        if section and "abstract" in section:
            if kind == "para":
                abstract.append(pay)
        elif section and "list of figures" in section:
            if kind == "table":
                lof = pay
        elif section and "list of tables" in section:
            if kind == "table":
                lot = pay
        elif section and "abbreviation" in section:
            if kind == "table":
                abbr = pay
    abstract_file = DRAFT / "abstract"
    if abstract_file.exists():
        abstract = [" ".join(
            abstract_file.read_text(encoding="utf-8").split())]
    bib = parse_md(DRAFT / "Bibliography.md")
    bib_entries = [p for k, p in bib if k in ("bullet", "para")]
    return abstract, lof, lot, abbr, bib_entries


# ================================================================ DOCX build
def build_docx() -> Path:
    from docx import Document
    from docx.enum.section import WD_SECTION
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.enum.table import WD_TABLE_ALIGNMENT
    from docx.oxml.ns import qn
    from docx.oxml import OxmlElement
    from docx.shared import Pt, Inches, RGBColor

    doc = Document()
    # -- base style
    normal = doc.styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(11)
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.15
    for name, size, bold in [("Heading 1", 17, True), ("Heading 2", 13, True),
                             ("Heading 3", 11.5, True)]:
        st = doc.styles[name]
        st.font.name = "Calibri"
        st.font.size = Pt(size)
        st.font.bold = bold
        st.font.color.rgb = RGBColor(0, 0, 0)

    sec = doc.sections[0]
    sec.page_width, sec.page_height = Inches(8.5), Inches(11)
    sec.left_margin = sec.right_margin = Inches(1.25)
    sec.top_margin = sec.bottom_margin = Inches(0.6)
    sec.header_distance, sec.footer_distance = Inches(0.3), Inches(0.3)

    NAVY = RGBColor(0x18, 0x3B, 0x56)

    def add_centered(text, size, bold=True, color=None, space_after=6):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(text)
        r.font.name = "Calibri"
        r.font.size = Pt(size)
        r.bold = bold
        if color is not None:
            r.font.color.rgb = color
        p.paragraph_format.space_after = Pt(space_after)
        return p

    def add_para(text):
        # light inline-code handling: `x` -> Consolas
        p = doc.add_paragraph()
        for j, chunk in enumerate(re.split(r"(`[^`]+`)", text)):
            if not chunk:
                continue
            r = p.add_run(chunk[1:-1] if chunk.startswith("`") else chunk)
            r.font.name = "Calibri" if not chunk.startswith("`") else "Consolas"
            r.font.size = Pt(11)
        p.paragraph_format.space_after = Pt(6)
        return p

    def add_bullet(text):
        p = doc.add_paragraph(style="List Bullet")
        p.clear()
        r = p.add_run(text)
        r.font.name = "Calibri"
        r.font.size = Pt(11)
        return p

    def add_table(headers, rows, caption=None, fontsize=9.5):
        t = doc.add_table(rows=1 + len(rows), cols=len(headers))
        t.style = "Light Grid Accent 1"
        t.alignment = WD_TABLE_ALIGNMENT.CENTER
        for j, h in enumerate(headers):
            c = t.cell(0, j)
            c.text = ""
            r = c.paragraphs[0].add_run(h)
            r.bold = True
            r.font.name = "Calibri"
            r.font.size = Pt(fontsize)
        for ri, row in enumerate(rows, start=1):
            for j in range(len(headers)):
                c = t.cell(ri, j)
                c.text = ""
                val = row[j] if j < len(row) else ""
                r = c.paragraphs[0].add_run(val)
                r.font.name = "Calibri"
                r.font.size = Pt(fontsize)
        doc.add_paragraph().paragraph_format.space_after = Pt(2)
        if caption:
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            r = p.add_run(caption)
            r.bold = True
            r.font.name = "Calibri"
            r.font.size = Pt(9.5)
        return t

    def add_figure(alt, relpath, width_in=6.0):
        img = (FIGDIR / relpath)
        if not img.exists():
            p = doc.add_paragraph()
            p.add_run(f"[missing image: {relpath}]")
            return
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.add_run().add_picture(str(img), width=Inches(width_in))
        cap = doc.add_paragraph()
        cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = cap.add_run(alt if alt else relpath)
        r.bold = True
        r.font.name = "Calibri"
        r.font.size = Pt(9.5)

    def set_section_header_footer(section, header_right: str | None,
                                  footer_number_format="arabic",
                                  restart=True):
        # header
        hp = section.header.paragraphs[0]
        hp.clear()
        hp.paragraph_format.space_after = Pt(0)
        if header_right is None:
            r = hp.add_run("")
        else:
            r = hp.add_run(f"{HEADER_LEFT}\t{header_right}")
            r.font.name = "Calibri"
            r.font.size = Pt(10)
            # right-align after tab
            hp.paragraph_format.tab_stops.clear_all() if hasattr(
                hp.paragraph_format, "tab_stops") else None
        fp = section.footer.paragraphs[0]
        fp.clear()
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = fp.add_run()
        fld1 = OxmlElement("w:fldChar")
        fld1.set(qn("w:fldCharType"), "begin")
        instr = OxmlElement("w:instrText")
        instr.set(qn("xml:space"), "preserve")
        instr.text = "PAGE"
        fld2 = OxmlElement("w:fldChar")
        fld2.set(qn("w:fldCharType"), "end")
        r._r.append(fld1)
        r2 = fp.add_run()
        r2._r.append(instr)
        r3 = fp.add_run()
        r3._r.append(fld2)

    def new_body_section(header_right):
        s = doc.add_section(WD_SECTION.NEW_PAGE)
        s.page_width, s.page_height = Inches(8.5), Inches(11)
        s.left_margin = s.right_margin = Inches(1.25)
        s.top_margin = s.bottom_margin = Inches(0.6)
        s.header_distance, s.footer_distance = Inches(0.3), Inches(0.3)
        s.header.is_linked_to_previous = False
        s.footer.is_linked_to_previous = False
        set_section_header_footer(s, header_right)
        return s

    abstract, lof, lot, abbr, bib_entries = parse_front_matter()

    # ---------- recreated frontmatter (editable) ----------
    add_centered("PROJECT REPORT", 16)
    add_centered("On", 14)
    add_centered("ExamAI \u2014 AI-Powered Exam Preparation "
                 "over Teacher-Approved Material", 16)
    add_centered("Submitted by", 12)
    for line in ["PATEL DHAIRYA (IU2341230041)",
                 "KHATRI KESHAV (IU2341230068)",
                 "PATEL SWET (IU2341230111)"]:
        add_centered(line, 12)
    add_centered("In fulfillment for the requirements of Software Group "
                 "Project as a part of BACHELOR OF TECHNOLOGY in COMPUTER "
                 "SCIENCE AND ENGINEERING", 11)
    add_centered("INSTITUTE OF TECHNOLOGY AND ENGINEERING, INDUS UNIVERSITY "
                 "CAMPUS, RANCHARDA, VIA-THALTEJ, AHMEDABAD-382115, GUJARAT, "
                 "INDIA. WEB: www.indusuni.ac.in", 11)
    add_centered("NOV 2026", 12)
    doc.add_page_break()
    add_centered("PROJECT REPORT ON ExamAI", 16)
    add_para("PREPARED BY: Patel Dhairya (IU2341230041), Khatri Keshav "
             "(IU2341230068), Patel Swet (IU2341230111). UNDER GUIDANCE OF "
             "(Internal Guide): Ms. Shreya Bhatt, Assistant Professor, "
             "Department of Computer Science and Engineering, IITE, Indus "
             "University, Ahmedabad. SUBMITTED TO: Institute of Technology "
             "and Engineering, Indus University. NOV 2026.")
    doc.add_page_break()
    for nm, en in [("PATEL DHAIRYA", "IU2341230041"),
                   ("KHATRI KESHAV", "IU2341230068"),
                   ("PATEL SWET", "IU2341230111")]:
        add_centered("CANDIDATE'S DECLARATION", 14)
        add_para(f"I declare that the final semester report entitled "
                 f"\u201cExamAI\u201d is my own work conducted under the "
                 f"supervision of the guide Ms. Shreya Bhatt. I further "
                 f"declare that to the best of my knowledge, the report does "
                 f"not contain part of the work submitted for the award of "
                 f"B.Tech Degree either in this university or any other "
                 f"university without proper citation. Candidate's Signature "
                 f"— {nm} ({en}). Guide: Ms. Shreya Bhatt, Assistant "
                 f"Professor, CSE, Indus Institute of Technology and "
                 f"Engineering, Indus University, Ahmedabad.")
        doc.add_page_break()
    add_centered("COLLEGE CERTIFICATE", 14)
    add_para("This is to certify that the Software Group Project work entitled "
             "\u2018ExamAI \u2014 AI-Powered Exam Preparation over "
             "Teacher-Approved Material\u2019 has been carried out by Patel "
             "Dhairya, Khatri Keshav and Patel Swet under the guidance of Ms. "
             "Shreya Bhatt in partial fulfillment of the requirements for the "
             "Bachelor of Technology in Computer Science and Engineering (7th "
             "Semester) of Indus University, Ahmedabad during the academic "
             "year 2026. Signatories: Ms. Shreya Bhatt (Guide) | Dr. Kaushal "
             "Jani (Head of Department) | Prof. Zalak Vyas (Head of "
             "Department). Date: __/10/2026.")
    doc.add_page_break()
    add_centered("ACKNOWLEDGEMENT", 14)
    add_para("We thank our internal guide, Ms. Shreya Bhatt, Assistant "
             "Professor, Department of Computer Science and Engineering, for "
             "her constant guidance \u2014 from finalizing the project scope, "
             "through the system design and RAG architecture reviews, to the "
             "final report. We thank Dr. Kaushal Jani and Prof. Zalak Vyas, "
             "Heads of the Department of Computer Science and Engineering, "
             "and the faculty of Indus Institute of Technology and "
             "Engineering for their encouragement and for an environment that "
             "supports independent, practical project work. We also thank Mr. "
             "Jignesh Patel for his help in identifying and defining the "
             "project topic. Finally, we thank our families and friends for "
             "their patience and support during the many hours spent building, "
             "testing and documenting this project. \u2014 Patel Dhairya "
             "(IU2341230041), Khatri Keshav (IU2341230068), Patel Swet "
             "(IU2341230111), Computer Science & Engineering.")

    # ---------- abstract / TOC / lists ----------
    doc.add_page_break()
    add_centered("ABSTRACT", 16)
    for p_ in abstract:
        add_para(p_)

    doc.add_page_break()
    add_centered("TABLE OF CONTENT", 16)
    add_para("Title                                                                 "
             "Page No")
    # static TOC (headings) + Word field so Word can paginate on open
    toc_entries = []
    for fname, label in CHAPTERS:
        toc_entries.append((0, label))
        for kind, pay in parse_md(DRAFT / fname):
            if kind == "h2":
                toc_entries.append((1, pay))
            elif kind == "h3":
                toc_entries.append((2, pay))
    for lvl, title in toc_entries:
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(1)
        p.paragraph_format.left_indent = Inches(0.25 * lvl)
        r = p.add_run(title)
        r.bold = (lvl == 0)
        r.font.name = "Calibri"
        r.font.size = Pt(11)
    # Word auto-TOC field
    p = doc.add_paragraph()
    r = p.add_run()
    fld = OxmlElement("w:fldChar")
    fld.set(qn("w:fldCharType"), "begin")
    r._r.append(fld)
    r2 = p.add_run()._r
    ins = OxmlElement("w:instrText")
    ins.set(qn("xml:space"), "preserve")
    ins.text = 'TOC \\o "1-3" \\h \\z \\u'
    r2.append(ins)
    r3 = p.add_run()._r
    fe = OxmlElement("w:fldChar")
    fe.set(qn("w:fldCharType"), "end")
    r3.append(fe)
    add_para("(Right-click the table of contents in Word and choose \u201cUpdate "
             "Field\u201d to fill page numbers after layout.)")

    if lof:
        doc.add_page_break()
        add_centered("LIST OF FIGURES", 16)
        add_table(lof[0], lof[1], caption=None)
    if lot:
        doc.add_page_break()
        add_centered("LIST OF TABLES", 16)
        add_table(lot[0], lot[1], caption=None)
    if abbr:
        doc.add_page_break()
        add_centered("ABBREVIATIONS", 16)
        add_table(abbr[0], abbr[1], caption=None)

    # ---------- chapters, one section each for running header ----------
    for fname, label in CHAPTERS:
        new_body_section(label)
        blocks = parse_md(DRAFT / fname)
        # chapter opener: h1 + outline bullets
        first = True
        for kind, pay in blocks:
            if kind == "h1" and first:
                add_centered(label, 17, color=NAVY, space_after=12)
                first = False
                continue
            if kind == "h1":
                add_centered(pay.upper(), 17, color=NAVY, space_after=12)
            elif kind == "h2":
                h = doc.add_heading(level=2)
                r = h.add_run(pay)
                r.font.name = "Calibri"
                r.font.size = Pt(13)
                r.bold = True
            elif kind == "h3":
                h = doc.add_heading(level=3)
                r = h.add_run(pay)
                r.font.name = "Calibri"
                r.font.size = Pt(11.5)
                r.bold = True
            elif kind == "bullet":
                # chapter-outline bullets (ALL-CAPS short) get ▪ marker look
                add_bullet(pay)
            elif kind == "para":
                add_para(pay)
            elif kind == "table":
                headers, rows, cap = pay
                add_table(headers, rows, caption=cap)
            elif kind == "figure":
                alt, rel = pay
                add_figure(alt, rel)
            elif kind == "caption":
                p = doc.add_paragraph()
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                r = p.add_run(pay)
                r.bold = True
                r.font.name = "Calibri"
                r.font.size = Pt(9.5)

    # ---------- bibliography ----------
    new_body_section("BIBLIOGRAPHY")
    add_centered("BIBLIOGRAPHY", 17, color=NAVY, space_after=12)
    for n, entry in enumerate(bib_entries, start=1):
        add_para(f"{entry}" if re.match(r"^\d+\.", entry) else f"{n}. {entry}")

    doc.save(OUT_DOCX)
    print(f"wrote {OUT_DOCX}")
    return OUT_DOCX


# ================================================================ PDF build
def build_body_pdf() -> Path:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame,
                                    Paragraph, Spacer, Table, TableStyle,
                                    Image, PageBreak,
                                    tableofcontents)
    from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY

    PAGE_W, PAGE_H = letter  # 612 x 792
    ML = MR = 90  # 1.25in side margins (AutoVerse)
    MT, MB = 56, 62
    FW = PAGE_W - ML - MR  # 432

    abstract, lof, lot, abbr, bib_entries = parse_front_matter()

    sTitle = ParagraphStyle("Title", fontName="Helvetica-Bold", fontSize=17,
                            leading=21, alignment=TA_CENTER, spaceAfter=12)
    sH1 = ParagraphStyle("H1", fontName="Helvetica-Bold", fontSize=17,
                         leading=21, alignment=TA_CENTER, spaceAfter=12,
                         textColor=colors.HexColor("#183B56"))
    sH2 = ParagraphStyle("H2", fontName="Helvetica-Bold", fontSize=13,
                         leading=16, spaceBefore=10, spaceAfter=6)
    sH3 = ParagraphStyle("H3", fontName="Helvetica-Bold", fontSize=11.5,
                         leading=14, spaceBefore=8, spaceAfter=4)
    sBody = ParagraphStyle("Body", fontName="Helvetica", fontSize=11,
                           leading=14.5, alignment=TA_JUSTIFY, spaceAfter=6)
    sBullet = ParagraphStyle("Bullet", parent=sBody, leftIndent=24,
                              bulletIndent=10, spaceAfter=3)
    sCap = ParagraphStyle("Cap", fontName="Helvetica-Bold", fontSize=9.5,
                          leading=12, alignment=TA_CENTER, spaceAfter=8,
                          spaceBefore=4)
    sCell = ParagraphStyle("Cell", fontName="Helvetica", fontSize=9,
                           leading=11)
    sCellH = ParagraphStyle("CellH", parent=sCell, fontName="Helvetica-Bold")
    sTOC0 = ParagraphStyle("TOC0", fontName="Helvetica-Bold", fontSize=11,
                           leading=14)
    sTOC1 = ParagraphStyle("TOC1", fontName="Helvetica", fontSize=11,
                           leading=14, leftIndent=18)
    sTOC2 = ParagraphStyle("TOC2", fontName="Helvetica", fontSize=11,
                           leading=14, leftIndent=36)

    ROMAN = [(1000, "m"), (900, "cm"), (500, "d"), (400, "cd"),
             (100, "c"), (90, "xc"), (50, "l"), (40, "xl"),
             (10, "x"), (9, "ix"), (5, "v"), (4, "iv"), (1, "i")]

    def roman(n):
        out = ""
        for v, s_ in ROMAN:
            while n >= v:
                out += s_
                n -= v
        return out

    REC = {"heads": [], "figs": [], "tabs": [],
           "chapter": "", "front_count": 0, "collect": False}

    def page_end_front(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 10)
        canvas.drawCentredString(PAGE_W / 2, 36, roman(canvas.getPageNumber()))
        canvas.restoreState()

    def page_end_body(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 10)
        canvas.drawString(ML, PAGE_H - 38, HEADER_LEFT)
        canvas.drawRightString(PAGE_W - MR, PAGE_H - 38, REC["chapter"])
        canvas.drawString(ML, 36, FOOTER_LEFT)
        canvas.drawRightString(
            PAGE_W - MR, 36,
            str(canvas.getPageNumber() - REC["front_count"]))
        canvas.restoreState()

    front_frame = Frame(ML, MB, FW, PAGE_H - MT - MB, id="front")
    body_frame = Frame(ML, MB, FW, PAGE_H - MT - MB, id="body")
    doc = BaseDocTemplate(str(OUT_BODY_PDF), pagesize=letter,
                          leftMargin=ML, rightMargin=MR,
                          topMargin=MT, bottomMargin=MB,
                          title="ExamAI — SGP Report (body)",
                          author="ExamAI team")
    doc.addPageTemplates([
        PageTemplate(id="front", frames=[front_frame],
                     onPageEnd=page_end_front),
        PageTemplate(id="body", frames=[body_frame],
                     onPageEnd=page_end_body),
    ])

    from reportlab.platypus import NextPageTemplate, KeepTogether
    from reportlab.platypus.flowables import HRFlowable

    story = []
    P = lambda t, s=sBody: Paragraph(t.replace("&", "&amp;")
                                     .replace("<", "&lt;")
                                     .replace(">", "&gt;"), s)

    def para(text):
        # `code` -> courier
        parts = re.split(r"(`[^`]+`)", text)
        xml = ""
        for ch in parts:
            ch = ch.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            if ch.startswith("`"):
                xml += f'<font face="Courier">{ch[1:-1]}</font>'
            else:
                xml += ch
        return Paragraph(xml, sBody)

    def bullets(text):
        return Paragraph(text.replace("&", "&amp;"), sBullet,
                         bulletText="\u2022")

    def styled_table(headers, rows, widths=None):
        data = [[Paragraph(h, sCellH) for h in headers]]
        for row in rows:
            data.append([Paragraph((row[j] if j < len(row) else ""), sCell)
                         for j in range(len(headers))])
        cw = widths or ([FW / len(headers)] * len(headers))
        t = Table(data, colWidths=cw, repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#DCEAF4")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#60717F")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ]))
        return t

    from reportlab.platypus import CondPageBreak

    def disp_num(page):
        if page <= REC["front_count"] or REC["front_count"] == 0:
            return roman(page)
        return str(page - REC["front_count"])

    def add_fig(story, alt, rel):
        img = FIGDIR / rel
        if not img.exists():
            story.append(Paragraph(f"[missing image: {rel}]", sBody))
            return
        from PIL import Image as PILImage
        with PILImage.open(img) as im:
            iw, ih = im.size
        w = FW if "Screenshot" in rel or iw > 1500 else FW * 0.92
        h = w * ih / iw
        max_h = PAGE_H - MT - MB - 60
        if h > max_h:
            h = max_h
            w = h * iw / ih
        story.append(CondPageBreak(h + 34))
        story.append(Image(str(img), width=w, height=h))
        if alt:
            story.append(Paragraph(alt, sCap))

    def toc_entry(level, title, num):
        dots = "." * max(3, 74 - len(title) - len(num) - level * 4)
        txt = f"{title} {dots} {num}"
        return Paragraph(txt, [sTOC0, sTOC1, sTOC2][min(level, 2)])

    def static_heads():
        """Full heading order, so pass-1 pagination matches pass 2."""
        heads = []
        for fname, label in CHAPTERS:
            heads.append((0, label))
            for kind, pay in parse_md(DRAFT / fname):
                if kind == "h2":
                    heads.append((1, pay[:80]))
                elif kind == "h3":
                    heads.append((2, pay[:80]))
        return heads

    STATIC_HEADS = static_heads()

    def assemble(numbered):
        """Build the story. Pass 1 (numbered=False): placeholder TOC/lists
        while afterFlowable records heading/figure/table pages."""
        story = []
        # ---- front section (roman) ----
        story.append(Paragraph("ABSTRACT", sTitle))
        for p_ in abstract:
            story.append(para(p_))
        story.append(PageBreak())

        story.append(Paragraph("TABLE OF CONTENT", sTitle))
        story.append(Paragraph("Title", sTOC0))
        if numbered:
            for lvl, title, page in REC["heads"]:
                story.append(toc_entry(lvl, title, disp_num(page)))
        else:
            for lvl, title in STATIC_HEADS:
                story.append(Paragraph(
                    title, [sTOC0, sTOC1, sTOC2][min(lvl, 2)]))
        story.append(PageBreak())

        if lof:
            story.append(Paragraph("LIST OF FIGURES", sTitle))
            if numbered:
                figmap = dict(REC["figs"])
                rows = [r + [disp_num(figmap[r[0].lower()])
                             if r[0].lower() in figmap else ""]
                        for r in lof[1]]
                story.append(styled_table(
                    lof[0] + ["Page No."], rows,
                    widths=[FW * 0.22, FW * 0.62, FW * 0.16]))
            else:
                story.append(styled_table(lof[0], lof[1]))
            story.append(PageBreak())
        if lot:
            story.append(Paragraph("LIST OF TABLES", sTitle))
            if numbered:
                tabmap = dict(REC["tabs"])
                rows = [r + [disp_num(tabmap[r[0].lower()])
                             if r[0].lower() in tabmap else ""]
                        for r in lot[1]]
                story.append(styled_table(
                    lot[0] + ["Page No."], rows,
                    widths=[FW * 0.22, FW * 0.62, FW * 0.16]))
            else:
                story.append(styled_table(lot[0], lot[1]))
            story.append(PageBreak())
        if abbr:
            story.append(Paragraph("ABBREVIATIONS", sTitle))
            story.append(styled_table(abbr[0], abbr[1]))

        # ---- body (arabic): switch template ----
        story.append(NextPageTemplate("body"))
        # NOTE: no PageBreak here — the chapter loop's leading PageBreak
        # ships the abbreviations page and starts the body template.

        for fname, label in CHAPTERS:
            blocks = parse_md(DRAFT / fname)
            story.append(PageBreak())
            story.append(Paragraph(label, sH1))
            first = True
            for kind, pay in blocks:
                if kind == "h1" and first:
                    first = False
                    continue  # already emitted as label
                if kind == "h1":
                    story.append(Paragraph(pay.upper(), sH1))
                elif kind == "h2":
                    story.append(Paragraph(pay, sH2))
                elif kind == "h3":
                    story.append(Paragraph(pay, sH3))
                elif kind == "bullet":
                    story.append(bullets(pay))
                elif kind == "para":
                    story.append(para(pay))
                elif kind == "table":
                    headers, rows, cap = pay
                    story.append(styled_table(headers, rows))
                    story.append(Spacer(1, 2))
                    if cap:
                        story.append(Paragraph(cap, sCap))
                elif kind == "figure":
                    alt, rel = pay
                    add_fig(story, alt, rel)
                elif kind == "caption":
                    story.append(Paragraph(pay, sCap))

        story.append(PageBreak())
        story.append(Paragraph("BIBLIOGRAPHY", sH1))
        for n, entry in enumerate(bib_entries, start=1):
            txt = entry if re.match(r"^\d+\.", entry) else f"{n}. {entry}"
            story.append(para(txt))
        return story

    def after_flowable(flowable):
        import re as _re
        if not isinstance(flowable, Paragraph):
            return
        clean = _re.sub(r"<[^>]+>", "",
                        getattr(flowable, "text", "")).strip()
        st = flowable.style.name
        if st == "H1" and clean.startswith("CHAPTER"):
            REC["chapter"] = clean[:70]
            if REC["collect"]:
                REC["heads"].append((0, clean[:70], doc.page))
        elif st == "H1" and clean == "BIBLIOGRAPHY":
            REC["chapter"] = clean
        elif st == "H2":
            if REC["collect"]:
                REC["heads"].append((1, clean[:80], doc.page))
        elif st == "H3":
            if REC["collect"]:
                REC["heads"].append((2, clean[:80], doc.page))
        elif st == "Cap" and REC["collect"]:
            low = clean.lower()
            if low.startswith("figure"):
                REC["figs"].append((low.split(":")[0].strip(), doc.page))
            elif low.startswith("table"):
                REC["tabs"].append((low.split(":")[0].strip(), doc.page))

    doc.afterFlowable = after_flowable

    # Pass 1: collect heading/figure/table pages (throwaway PDF).
    REC["collect"] = True
    REC["chapter"] = ""
    import tempfile
    tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False).name
    real_filename = doc.filename
    doc.filename = tmp
    doc.build(assemble(numbered=False))
    Path(tmp).unlink(missing_ok=True)

    # Derive front/body split from first chapter page.
    first_ch = next((p for lvl, _t, p in REC["heads"] if lvl == 0), None)
    body_pages = max([p for _, _, p in REC["heads"]] +
                     [p for _, p in REC["figs"]] +
                     [p for _, p in REC["tabs"]] + [1])
    REC["front_count"] = (first_ch - 1) if first_ch else 0

    # Pass 2: final build with numbered TOC / lists (keep pass-1 records).
    REC["collect"] = False
    REC["chapter"] = ""
    doc.filename = real_filename
    doc.build(assemble(numbered=True))
    print(f"wrote {OUT_BODY_PDF} (body pages: {body_pages}, "
          f"front pages: {REC['front_count']})")
    return OUT_BODY_PDF


def merge_final():
    from pypdf import PdfReader, PdfWriter
    if not FRONT_PDF.exists():
        print(f"WARNING: {FRONT_PDF} missing; final PDF = body only")
        body = PdfReader(str(OUT_BODY_PDF))
        w = PdfWriter()
        for p in body.pages:
            w.add_page(p)
    else:
        front = PdfReader(str(FRONT_PDF))
        body = PdfReader(str(OUT_BODY_PDF))
        w = PdfWriter()
        for p in front.pages:
            w.add_page(p)
        for p in body.pages:
            w.add_page(p)
    with open(OUT_FINAL_PDF, "wb") as f:
        w.write(f)
    print(f"wrote {OUT_FINAL_PDF} "
          f"({len(w.pages)} pages: front + body)")


if __name__ == "__main__":
    which = set(sys.argv[1:]) or {"docx", "pdf", "merge"}
    if "docx" in which:
        build_docx()
    if "pdf" in which:
        build_body_pdf()
    if "merge" in which:
        merge_final()
