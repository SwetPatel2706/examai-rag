"""Generate the Chapter 7 ExamAI diagrams as clean academic report figures.

Run from the repository root with backend/venv/bin/python.
"""
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Ellipse, Polygon, FancyArrowPatch


OUT = Path(__file__).parent / "figures"
OUT.mkdir(exist_ok=True)

NAVY = "#183B56"
BLUE = "#DCEAF4"
PALE = "#F3F6F8"
INK = "#23313B"
GRAY = "#60717F"
GOLD = "#F2C66D"
GREEN = "#DCEBDD"
RED = "#F3DDDA"
WHITE = "#FFFFFF"

plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "font.size": 10,
    "text.color": INK,
    "axes.labelcolor": INK,
})


def canvas(title, subtitle=None, size=(11, 8), ylim=(0, 10)):
    fig, ax = plt.subplots(figsize=size)
    fig.patch.set_facecolor(WHITE)
    ax.set_facecolor(WHITE)
    ax.set_xlim(0, 14)
    ax.set_ylim(*ylim)
    ax.axis("off")
    ax.text(7, ylim[1] - .35, title, ha="center", va="top", fontsize=18,
            weight="bold", color=NAVY)
    if subtitle:
        ax.text(7, ylim[1] - .8, subtitle, ha="center", va="top", fontsize=9,
                color=GRAY)
    return fig, ax


def box(ax, x, y, w, h, title, detail="", fc=PALE, ec=NAVY, title_size=10,
        detail_size=8, radius=.12, lw=1.25):
    patch = FancyBboxPatch((x, y), w, h,
                           boxstyle=f"round,pad=0.04,rounding_size={radius}",
                           facecolor=fc, edgecolor=ec, linewidth=lw)
    ax.add_patch(patch)
    ax.text(x+w/2, y+h*.66 if detail else y+h/2, title, ha="center", va="center",
            fontsize=title_size, weight="bold", color=NAVY, wrap=True)
    if detail:
        ax.text(x+w/2, y+h*.30, detail, ha="center", va="center",
                fontsize=detail_size, color=INK, wrap=True, linespacing=1.25)
    return patch


def arrow(ax, x1, y1, x2, y2, label=None, color=GRAY, rad=0, style="-|>", lw=1.2,
          label_offset=(0, .15), linestyle="-"):
    p = FancyArrowPatch((x1, y1), (x2, y2), arrowstyle=style,
                        connectionstyle=f"arc3,rad={rad}", mutation_scale=12,
                        linewidth=lw, color=color, linestyle=linestyle)
    ax.add_patch(p)
    if label:
        ax.text((x1+x2)/2+label_offset[0], (y1+y2)/2+label_offset[1], label,
                ha="center", va="center", fontsize=8, color=INK,
                bbox=dict(facecolor=WHITE, edgecolor="none", pad=1.4, alpha=.92))
    return p


def save(fig, name):
    fig.savefig(OUT/name, dpi=200, bbox_inches="tight", pad_inches=.2,
                facecolor=WHITE)
    plt.close(fig)


def architecture():
    fig, ax = canvas("ExamAI System Architecture",
                     "Layered web application with teacher-owned materials and metadata-filtered retrieval",
                     size=(12, 8.2))
    # Layer bands
    bands = [(7.8, "PRESENTATION", "#F7F9FB"), (6.05, "API / ROUTES", "#F1F5F8"),
             (4.15, "APPLICATION SERVICES", "#F7F9FB"), (2.05, "DATA + EXTERNAL SERVICES", "#F1F5F8")]
    for y, label, color in bands:
        ax.add_patch(FancyBboxPatch((.35, y-.2), 13.3, 1.52,
                       boxstyle="round,pad=.03,rounding_size=.1", facecolor=color,
                       edgecolor="#D5DEE5", linewidth=.8, zorder=0))
        ax.text(.58, y+1.05, label, fontsize=8, weight="bold", color=GRAY, va="center")
    box(ax, 2.0, 7.95, 4.0, .75, "Student web client", "React + Vite", fc=BLUE)
    box(ax, 8.0, 7.95, 4.0, .75, "Teacher web client", "React + Vite", fc=BLUE)
    box(ax, 2.05, 6.23, 9.9, .8, "FastAPI routes", "Role dependencies · request validation · standard response envelope", fc=BLUE)
    box(ax, .75, 4.35, 3.0, .95, "Subject & material", "membership · upload · status", fc=PALE)
    box(ax, 4.0, 4.35, 3.0, .95, "Learning services", "RAG chat · flashcards · quizzes", fc=PALE)
    box(ax, 7.25, 4.35, 3.0, .95, "Ingestion pipeline", "parse · chunk · embed · upsert", fc=PALE)
    box(ax, 10.5, 4.35, 2.75, .95, "Analytics services", "class results · progress", fc=PALE)
    box(ax, .55, 2.25, 3.0, .95, "Supabase", "Auth · Postgres · private Storage", fc=GREEN)
    box(ax, 4.0, 2.25, 3.0, .95, "Qdrant Cloud", "one collection · filtered by subject + material", fc=GREEN, detail_size=7.5)
    box(ax, 7.45, 2.25, 2.6, .95, "Gemini", "structured generation", fc=GREEN)
    box(ax, 10.45, 2.25, 2.8, .95, "Local embedding model", "all-MiniLM-L6-v2", fc=GREEN, detail_size=7.5)
    # Flow
    arrow(ax, 4, 7.95, 5.5, 7.05)
    arrow(ax, 10, 7.95, 8.5, 7.05)
    arrow(ax, 4.2, 6.23, 2.3, 5.3)
    arrow(ax, 6.0, 6.23, 5.5, 5.3)
    arrow(ax, 8.0, 6.23, 8.7, 5.3)
    arrow(ax, 9.8, 6.23, 11.8, 5.3)
    arrow(ax, 2.3, 4.35, 2.05, 3.2, "authorized relational reads / writes", label_offset=(-.65, 0))
    arrow(ax, 5.3, 4.35, 5.45, 3.2, "filtered retrieval / payloads", label_offset=(.8, 0))
    arrow(ax, 8.1, 4.35, 8.75, 3.2, "generation", label_offset=(.35, 0))
    arrow(ax, 9.0, 4.35, 11.5, 3.2, "vectors", label_offset=(.4, 0))
    arrow(ax, 8.3, 4.35, 5.8, 3.2, "vector upsert", rad=.05, label_offset=(-.25, -.05))
    ax.text(7, .65, "Subject authorization is enforced in services. Material vectors carry material_id, teacher_id and subject_id for scoped retrieval and citation attribution.",
            ha="center", va="center", fontsize=8.5, color=GRAY, wrap=True)
    save(fig, "fig71_architecture.png")


def class_diagram():
    fig, ax = canvas("ExamAI Domain Class Diagram",
                     "Core relational entities and cardinalities reflected in the SQLAlchemy models",
                     size=(12, 9.2), ylim=(0, 11))
    boxes = {
        "User": (.5, 8.3, 3.1, 1.65, "User", "id (PK)\nname · email · role"),
        "Subject": (5.45, 8.3, 3.1, 1.65, "Subject", "id (PK)\nname"),
        "SubjectTeacher": (.5, 5.75, 3.1, 1.65, "SubjectTeacher", "subject_id (PK, FK)\nteacher_id (PK, FK)"),
        "StudentSubject": (5.45, 5.75, 3.1, 1.65, "StudentSubject", "subject_id (PK, FK)\nstudent_id (PK, FK)"),
        "Material": (10.2, 8.3, 3.1, 1.65, "Material", "id (PK) · subject_id (FK)\nteacher_id (FK) · status · file"),
        "Quiz": (10.2, 5.75, 3.1, 1.65, "Quiz", "id (PK) · subject_id (FK)\nteacher_id (FK) · topic · status"),
        "QuizQuestion": (10.2, 3.25, 3.1, 1.65, "QuizQuestion", "id (PK) · quiz_id (FK)\nquestion · options · correct_option"),
        "QuizAttempt": (6.0, 3.25, 3.1, 1.65, "QuizAttempt", "id (PK) · quiz_id (FK)\nstudent_id (FK) · answers · score"),
        "FlashcardDeck": (1.0, 3.25, 3.1, 1.65, "FlashcardDeck", "id (PK) · student_id (FK)\nsubject_id (FK) · source_material_ids"),
        "Flashcard": (1.0, .7, 3.1, 1.65, "Flashcard", "id (PK) · deck_id (FK)\nfront · back · mastery_state"),
    }
    centers={}
    for key,(x,y,w,h,t,d) in boxes.items():
        box(ax,x,y,w,h,t,d,fc=BLUE,title_size=10,detail_size=8)
        centers[key]=(x+w/2,y+h/2)
    # Multiplicities and relationships
    arrow(ax,3.6,8.95,5.45,8.95,"teacher membership",label_offset=(0,.28))
    arrow(ax,3.6,6.55,5.45,6.55,"joins subject",label_offset=(0,.28))
    arrow(ax,2.0,8.3,2.0,7.4,"1",label_offset=(.28,0))
    arrow(ax,6.95,8.3,6.95,7.4,"1",label_offset=(.28,0))
    arrow(ax,3.6,6.1,5.45,6.1,"student enrollment",label_offset=(0,.28))
    arrow(ax,6.25,8.3,6.25,7.4,"1",label_offset=(.3,0))
    arrow(ax,8.55,9.1,10.2,9.1,"1 subject : many materials",label_offset=(0,.28))
    arrow(ax,8.55,8.65,10.2,6.8,"1 subject : many quizzes",rad=.04,label_offset=(.55,0))
    arrow(ax,11.75,5.75,11.75,4.9,"1 quiz : many questions",label_offset=(.9,0))
    arrow(ax,10.2,6.0,9.1,4.45,"1 quiz : many attempts",label_offset=(.45,.18))
    arrow(ax,7.55,5.75,7.55,4.9,"student",label_offset=(.45,0))
    arrow(ax,2.55,3.25,2.55,2.35,"1 deck : many cards",label_offset=(1.0,0))
    # Deck ownership and subject scope are explicit model relationships.
    arrow(ax,3.6,3.85,4.1,3.85,"student_id",label_offset=(0,.2))
    arrow(ax,5.55,8.3,3.95,4.9,"subject_id",rad=.2,label_offset=(-.45,.1))
    # Notes
    ax.text(7, .32, "A subject can have multiple teachers and students through join tables. Material and quiz records each identify one owning teacher and one subject.",
            ha="center", fontsize=8.5, color=GRAY, wrap=True)
    save(fig,"fig72_class.png")


def usecase():
    fig, ax = canvas("ExamAI Use-Case Diagram",
                     "Student and teacher functions within the ExamAI system boundary",
                     size=(12.5, 10), ylim=(0, 11.5))
    # UML-style dashed platform boundary; actors remain outside it.
    ax.add_patch(FancyBboxPatch((2.5,.55),9.4,9.75,boxstyle="round,pad=.02,rounding_size=0",
                    facecolor=WHITE,edgecolor=INK,linewidth=1.4,linestyle=(0,(6,4))))
    ax.text(7.2,10.0,"ExamAI Platform",ha="center",va="center",fontsize=12,weight="bold",color=INK)
    def actor(x,y,label):
        ax.add_patch(Ellipse((x,y+.5),.34,.34,facecolor=WHITE,edgecolor=INK,linewidth=1.3))
        ax.plot([x,x],[y+.33,y-.38],color=INK,lw=1.35)
        ax.plot([x-.31,x+.31],[y+.08,y+.08],color=INK,lw=1.35)
        ax.plot([x,x-.26],[y-.38,y-.78],color=INK,lw=1.35)
        ax.plot([x,x+.26],[y-.38,y-.78],color=INK,lw=1.35)
        ax.text(x,y-.98,label,ha="center",va="top",fontsize=9.2,weight="bold",color=INK)
    actor(1.25,7.7,"Student")
    actor(1.25,3.5,"Teacher")
    # One aligned column keeps each UML association independent and readable.
    cases=[(7.2,9.15,"Sign in / sign out"),(7.2,8.35,"View enrolled subjects"),
           (7.2,7.55,"Select approved materials"),(7.2,6.75,"Ask cited RAG questions"),
           (7.2,5.95,"Generate personal flashcards"),(7.2,5.15,"Take published quizzes"),
           (7.2,4.15,"Upload / manage materials"),(7.2,3.35,"Author / publish quizzes"),
           (7.2,2.55,"Review class analytics"),(7.2,1.75,"Generate quiz drafts")]
    for x,y,label in cases:
        ax.add_patch(Ellipse((x,y),3.5,.64,facecolor=WHITE,edgecolor=INK,linewidth=1.15))
        ax.text(x,y,label,ha="center",va="center",fontsize=8.2,color=INK,wrap=True)
    # Actor association lines are direct and role-specific, without arrowheads.
    # Compact actor trunks outside the boundary keep associations from crossing
    # through neighboring use-case ovals.
    ax.plot([1.55,2.3],[8.4,8.4],color=INK,lw=.75)
    ax.plot([2.3,2.3],[5.15,9.15],color=INK,lw=.75)
    for x,y,_ in cases[:6]:
        ax.plot([2.3,x-1.75],[y,y],color=INK,lw=.72)
    ax.plot([1.55,2.3],[3.8,3.8],color=INK,lw=.75)
    ax.plot([2.3,2.3],[2.55,4.15],color=INK,lw=.75)
    for x,y,_ in cases[6:]:
        ax.plot([2.3,x-1.75],[y,y],color=INK,lw=.72)
    ax.text(7.2,.85,"Subject-scoped operations require teacher assignment or student enrollment.",
            ha="center",fontsize=7.8,color=GRAY)
    save(fig,"fig73_usecase.png")


def sequence():
    fig, ax = canvas("RAG Chat Sequence Diagram",
                     "Selected-material retrieval with authorization and source attribution",
                     size=(13, 9.2), ylim=(0, 11))
    xs=[1.15,3.4,5.7,8.0,10.3,12.7]
    labels=["Student\nBrowser","FastAPI\nChat Route","Chat / Retrieval\nServices","Postgres\n(Supabase)","Qdrant\nCloud","Gemini"]
    for x,l in zip(xs,labels):
        box(ax,x-.78,9.0,1.56,.9,l,fc=BLUE,title_size=8.5)
        ax.plot([x,x],[1.3,9.0],color="#8796A1",lw=.9,linestyle=(0,(3,3)))
    msgs=[(1.15,3.4,8.05,"Question + subject + selected material IDs"),
          (3.4,5.7,7.35,"Authenticate student; validate request"),
          (5.7,8.0,6.65,"Check enrollment; validate ready materials"),
          (5.7,5.7,5.95,"Embed question with local MiniLM model"),
          (5.7,10.3,5.25,"Query subject + selected material filter"),
          (10.3,5.7,4.55,"Top chunks + payload metadata"),
          (5.7,12.7,3.85,"Generate structured answer from numbered context"),
          (12.7,5.7,3.15,"Answer text + source markers"),
          (5.7,5.7,2.45,"Resolve markers to teacher, file, locator"),
          (5.7,3.4,1.8,"Answer + attributed citations"),
          (3.4,1.15,1.2,"JSON response")]
    for i,(a,b,y,label) in enumerate(msgs):
        if a==b:
            ax.annotate("",xy=(a+.6,y),xytext=(a,y),arrowprops=dict(arrowstyle="-|>",color=GRAY,lw=1.1))
            ax.text(a+.32,y+.13,label,ha="center",va="bottom",fontsize=7.6,color=INK)
        else:
            arrow(ax,a,y,b,y,label,color=NAVY,label_offset=(0,.17),lw=1.0)
    ax.text(7,.45,"If no selected chunk contains text, the service returns a no-evidence answer with no citations.",
            ha="center",fontsize=8.2,color=GRAY)
    save(fig,"fig74_sequence.png")


def activity():
    fig, ax = canvas("Teacher Material Ingestion Activity",
                     "Processing state is version-guarded; indexed payloads preserve ownership and source location",
                     size=(10, 12), ylim=(0, 14))
    # Swimlanes
    lanes=[(.45,4.25,"Teacher / API"),(4.85,8.65,"Ingestion Worker"),(9.25,13.05,"Supabase / Qdrant")]
    for x1,x2,label in lanes:
        ax.add_patch(FancyBboxPatch((x1,.5),x2-x1,12.45,boxstyle="round,pad=.03,rounding_size=.08",
                       facecolor="#FBFCFD",edgecolor="#D5DEE5",linewidth=.8,zorder=0))
        ax.text((x1+x2)/2,12.65,label,ha="center",va="center",fontsize=9,weight="bold",color=NAVY)
    def task(x,y,text,fc=BLUE,w=3.0,h=.68):
        box(ax,x,y,w,h,text,fc=fc,title_size=8.2,radius=.14)
    # Main path uses short lane-to-lane handoffs, with ordered worker steps.
    task(.95,11.35,"Upload PDF / PPTX / DOCX")
    task(5.35,11.35,"Validate type + size")
    task(9.7,11.35,"Store private file; create record")
    task(5.35,9.95,"Parse text + source locators")
    task(5.35,8.75,"Normalize and chunk by format")
    task(5.35,7.55,"Create local embeddings")
    task(9.7,7.55,"Upsert vectors + payloads",fc=GREEN)
    task(5.35,6.15,"Check current version")
    task(9.7,4.8,"Mark ready in Postgres",fc=GREEN)
    task(.95,4.8,"Show ready status")
    arrow(ax,3.95,11.7,5.35,11.7)
    arrow(ax,8.35,11.7,9.7,11.7)
    arrow(ax,11.2,11.35,8.35,10.3,rad=.08)
    arrow(ax,6.85,9.95,6.85,9.43)
    arrow(ax,6.85,8.75,6.85,8.23)
    arrow(ax,8.35,7.9,9.7,7.9)
    arrow(ax,9.7,7.55,8.35,6.5,rad=.08)
    # Version decision
    ax.add_patch(Polygon([[5.95,5.45],[6.85,5.9],[7.75,5.45],[6.85,5.0]],closed=True,facecolor=GOLD,edgecolor=NAVY,lw=1))
    ax.text(6.85,5.45,"Current?",ha="center",va="center",fontsize=7.5,weight="bold",color=NAVY)
    arrow(ax,6.85,6.15,6.85,5.9)
    arrow(ax,7.75,5.45,9.7,5.15,"Yes",label_offset=(0,.18))
    arrow(ax,9.7,5.15,3.95,5.15,rad=.08)
    task(5.35,2.5,"Mark failed; allow retry",fc=RED)
    task(9.7,2.5,"Delete file + record + vectors",fc=RED)
    arrow(ax,6.85,5.0,6.85,3.18,"No / error",label_offset=(.5,0))
    arrow(ax,8.35,2.85,9.7,2.85)
    ax.text(7,.95,"Version guards keep stale workers from marking deleted or superseded materials ready.",
            ha="center",fontsize=8,color=GRAY)
    save(fig,"fig75_activity.png")


def dfd0():
    fig, ax = canvas("ExamAI Data Flow Diagram — Level 0",
                     "Context diagram: users interact with the ExamAI system and its external providers",
                     size=(12, 7.2), ylim=(0, 8.5))
    # entities and system
    box(ax,.65,5.4,2.5,1.1,"Student","questions · selected materials\nquiz answers · deck requests",fc=BLUE,detail_size=7.6)
    box(ax,.65,1.8,2.5,1.1,"Teacher","materials · quiz drafts\nclass review requests",fc=BLUE,detail_size=7.6)
    ax.add_patch(Ellipse((7,4.2),4.7,2.6,facecolor="#E6EFF5",edgecolor=NAVY,lw=1.8))
    ax.text(7,4.45,"0",ha="center",va="center",fontsize=10,color=GRAY)
    ax.text(7,4.05,"ExamAI Learning Platform",ha="center",va="center",fontsize=14,weight="bold",color=NAVY)
    box(ax,10.75,6.1,2.55,.95,"Supabase","Auth · relational data · files",fc=GREEN,detail_size=7.6)
    box(ax,10.75,3.75,2.55,.95,"Qdrant Cloud","filtered vector search",fc=GREEN,detail_size=7.6)
    box(ax,10.75,1.4,2.55,.95,"Gemini","structured content generation",fc=GREEN,detail_size=7.6)
    arrow(ax,3.15,5.95,4.8,4.8,"study requests",label_offset=(0,.2))
    arrow(ax,4.8,4.3,3.15,5.55,"answers · citations · scores · decks",rad=.08,label_offset=(0,.2))
    arrow(ax,3.15,2.35,4.8,3.7,"uploads · quiz authoring",label_offset=(0,.2))
    arrow(ax,4.8,3.45,3.15,2.05,"status · analytics",rad=.08,label_offset=(0,.2))
    arrow(ax,9.3,4.95,10.75,6.4,"identity · records · files",label_offset=(0,.2))
    arrow(ax,10.75,6.15,9.3,4.65,"authorized data",rad=.08,label_offset=(0,.2))
    arrow(ax,9.3,4.2,10.75,4.2,"vectors · metadata",label_offset=(0,.2))
    arrow(ax,10.75,3.95,9.3,3.95,"ranked chunks",label_offset=(0,-.2))
    arrow(ax,8.7,3.35,10.75,1.9,"generation prompt",label_offset=(0,.2))
    arrow(ax,10.75,1.65,8.7,3.05,"structured output",rad=.08,label_offset=(0,-.2))
    save(fig,"fig761_dfd0.png")


def dfd1():
    fig, ax = canvas("ExamAI Data Flow Diagram — Level 1",
                     "Student learning, teacher authoring, retrieval and persistent data",
                     size=(15, 10), ylim=(0, 11))
    box(ax,.45,7.5,1.8,.95,"Student",fc=PALE)
    box(ax,.45,2.5,1.8,.95,"Teacher",fc=PALE)
    def process(cx,cy,number,label):
        ax.add_patch(Ellipse((cx,cy),2.4,1.8,facecolor=WHITE,edgecolor=INK,lw=1.2))
        ax.plot([cx-1.0,cx+1.0],[cy+.52,cy+.52],color=INK,lw=.8)
        ax.text(cx,cy+.68,number,ha="center",va="center",fontsize=9,weight="bold",color=INK)
        ax.text(cx,cy-.14,label,ha="center",va="center",fontsize=9,weight="bold",color=INK,wrap=True)
    # Three clear lanes leave room for labeled flows and avoid stacking unrelated arrows.
    process(4.7,7.6,"1.0","Authenticate +\nsubject access")
    process(8.8,7.6,"2.0","Ingest teacher\nmaterials")
    process(8.8,4.2,"3.0","RAG chat +\ncitations")
    process(4.7,4.2,"4.0","Quizzes +\nflashcards")
    process(12.0,3.5,"5.0","Class analytics")
    # Data stores share a low, evenly spaced row.
    def store(x,y,w,title,detail):
        ax.plot([x,x+w],[y,y],color=INK,lw=1.05)
        ax.plot([x,x+w],[y+.72,y+.72],color=INK,lw=1.05)
        ax.plot([x,x],[y,y+.72],color=INK,lw=1.05)
        ax.text(x+w/2,y+.48,title,ha="center",va="center",fontsize=8,weight="bold",color=INK)
        ax.text(x+w/2,y+.18,detail,ha="center",va="center",fontsize=7,color=GRAY)
    store(2.5,.9,3.2,"D1 · Postgres","users · access · learning records")
    store(6.6,.9,3.2,"D2 · Qdrant","vectors · ownership metadata")
    store(10.7,.9,2.8,"D3 · Storage","private source files")
    box(ax,11.9,7.5,1.9,.85,"Gemini API","generation",fc="#F8EBCB",detail_size=7.5)
    # External actor exchanges.
    arrow(ax,2.25,7.95,3.48,7.8,"study request",label_offset=(0,.22))
    arrow(ax,3.48,7.35,2.25,7.55,"authorized response",label_offset=(0,-.22))
    arrow(ax,2.25,3.05,3.48,4.25,"authoring request",label_offset=(0,.2))
    arrow(ax,3.48,3.75,2.25,2.85,"scores / feedback",label_offset=(0,-.22))
    # Relational and vector stores; separated vertical paths keep labels legible.
    arrow(ax,4.7,6.7,4.7,1.68,"membership / access",label_offset=(1.0,0))
    arrow(ax,4.7,3.3,4.7,1.68,"quiz / deck records",label_offset=(-1.0,0))
    arrow(ax,8.8,6.7,8.8,1.68,"vector upsert",label_offset=(.62,0))
    arrow(ax,8.8,3.3,8.8,1.68,"filtered query",label_offset=(-.62,0))
    arrow(ax,9.25,1.68,9.25,3.3,"ranked chunks + metadata",label_offset=(1.0,0))
    # Generation, file storage, and analytics paths.
    arrow(ax,10.2,7.85,12.0,7.95,"generation prompt",label_offset=(0,.22))
    arrow(ax,12.0,7.55,10.2,7.45,"structured output",label_offset=(0,-.22))
    arrow(ax,10.0,4.7,11.9,7.5,"retrieved context",rad=-.08,label_offset=(.55,.08))
    arrow(ax,9.9,7.2,10.7,1.68,"private file write",rad=-.06,label_offset=(.7,.03))
    arrow(ax,10.0,3.5,7.5,1.68,"class-result reads",rad=0,label_offset=(0,.2))
    ax.text(7,.25,"Qdrant retrieval is scoped by subject_id and the student's selected material_ids; citation metadata identifies the source teacher and material.",
            ha="center",fontsize=8,color=GRAY)
    save(fig,"fig762_dfd1.png")


if __name__ == "__main__":
    architecture()
    class_diagram()
    usecase()
    sequence()
    activity()
    dfd0()
    dfd1()
    print(f"Generated seven ExamAI report figures in {OUT}")
