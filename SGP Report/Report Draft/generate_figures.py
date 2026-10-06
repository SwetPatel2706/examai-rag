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


def canvas(title, subtitle=None, size=(11, 8), ylim=(0, 10), xlim=(0, 14)):
    fig, ax = plt.subplots(figsize=size)
    fig.patch.set_facecolor(WHITE)
    ax.set_facecolor(WHITE)
    ax.set_xlim(*xlim)
    ax.set_ylim(*ylim)
    ax.axis("off")
    center_x = (xlim[0] + xlim[1]) / 2
    ax.text(center_x, ylim[1] - .35, title, ha="center", va="top", fontsize=18,
            weight="bold", color=NAVY)
    if subtitle:
        ax.text(center_x, ylim[1] - .8, subtitle, ha="center", va="top", fontsize=9,
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
        label_y = y + 1.32
        if label == "PRESENTATION":
            label_y = y + 1.05
        ax.text(.58, label_y, label, fontsize=8, weight="bold", color=GRAY, va="center")
    box(ax, 0.7, 7.95, 3.8, .75, "Student web client", "React + Vite", fc=BLUE)
    box(ax, 5.0, 7.95, 3.8, .75, "Teacher web client", "React + Vite", fc=BLUE)
    box(ax, 9.3, 7.95, 3.8, .75, "Admin web client", "/admin Users · Subjects · Membership", fc=BLUE, detail_size=7.5)
    box(ax, 2.05, 6.23, 9.9, .8, "FastAPI routes", "Role dependencies · request validation · standard response envelope", fc=BLUE)
    box(ax, .75, 4.35, 3.0, .95, "Subject & material", "membership · upload · status", fc=PALE)
    box(ax, 4.0, 4.35, 3.0, .95, "Learning services", "RAG chat · flashcards · quizzes", fc=PALE)
    box(ax, 7.25, 4.35, 3.0, .95, "Ingestion pipeline", "parse · chunk · embed · upsert", fc=PALE)
    box(ax, 10.5, 4.35, 2.75, .95, "Analytics services", "class results · progress", fc=PALE)
    box(ax, .55, 2.25, 3.0, .95, "Supabase", "Auth · Postgres · private Storage", fc=GREEN)
    box(ax, 4.0, 2.25, 3.0, .95, "Qdrant Cloud", "one collection · scoped metadata", fc=GREEN, detail_size=7.5)
    box(ax, 7.45, 2.25, 2.6, .95, "LLM", "structured generation", fc=GREEN)
    box(ax, 10.45, 2.25, 2.8, .95, "Local embedding model", "all-MiniLM-L6-v2", fc=GREEN, detail_size=7.5)
    # Flow
    arrow(ax, 2.6, 7.95, 5.5, 7.05)
    arrow(ax, 6.9, 7.95, 7.2, 7.05)
    arrow(ax, 11.2, 7.95, 8.8, 7.05)
    arrow(ax, 4.2, 6.23, 2.3, 5.3)
    arrow(ax, 6.0, 6.23, 5.5, 5.3)
    arrow(ax, 8.0, 6.23, 8.7, 5.3)
    arrow(ax, 9.8, 6.23, 11.8, 5.3)
    # Data-plane connections are placed in dedicated gaps between layer bands.
    arrow(ax, 2.3, 4.35, 2.05, 3.2)
    arrow(ax, 5.3, 4.35, 5.45, 3.2)
    arrow(ax, 8.1, 4.35, 8.75, 3.2)
    arrow(ax, 9.0, 4.35, 11.5, 3.2)
    arrow(ax, 8.3, 4.35, 5.8, 3.2, rad=.05)
    # The arrow endpoints and the caption below carry the flow meaning; omit
    # tiny labels in the narrow layer gap to avoid collisions.
    ax.text(7, .65, "Subject authorization is enforced in services. Material vectors carry material_id, teacher_id and subject_id for scoped retrieval and citation attribution.",
            ha="center", va="center", fontsize=8.5, color=GRAY, wrap=True)
    save(fig, "fig71_architecture.png")


def class_diagram():
    fig, ax = canvas("ExamAI Domain Class Diagram",
                     "Core relational entities and cardinalities reflected in the SQLAlchemy models",
                     size=(12, 9.2), ylim=(0, 11))
    boxes = {
        "User": (.5, 8.3, 3.1, 1.65, "User", "id (PK)\nname · email · role\nstudent | teacher | admin"),
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
    # Memberships use two join tables; connect each parent entity to its joins.
    # Join tables show their exact foreign keys. These local links plus the
    # note below make the two membership paths clear without crossed arrows.
    arrow(ax,2.0,8.3,2.0,7.4)
    arrow(ax,6.95,8.3,6.95,7.4)
    arrow(ax,8.55,9.1,10.2,9.1,"1 subject : many materials",label_offset=(0,.28))
    arrow(ax,8.55,8.65,10.2,6.8,"1 subject : many quizzes",rad=.04,label_offset=(.55,0))
    arrow(ax,11.75,5.75,11.75,4.9,"1 quiz : many questions",label_offset=(.9,0))
    arrow(ax,10.2,6.0,9.1,4.45,"1 quiz : many attempts",label_offset=(.45,.18))
    arrow(ax,2.55,3.25,2.55,2.35,"1 deck : many cards",label_offset=(1.0,0))
    # Deck subject scope and owner are both model foreign keys.
    arrow(ax,5.55,8.3,3.95,4.9,"subject_id",rad=.2,label_offset=(-.45,.1))
    # Notes
    # Admin users manage, but do not replace, the two subject-membership joins.
    ax.text(10.1, 2.2, "Admin manages memberships. SubjectTeacher.teacher_id and\nStudentSubject.student_id reference User; both join to Subject.",
            ha="center", fontsize=8.0, color=GRAY, wrap=True)
    ax.text(8.8, .28, "Subjects have multiple teachers and students via join tables; materials and quizzes each record one owning teacher and subject.",
            ha="center", fontsize=8.0, color=GRAY, wrap=True)
    save(fig,"fig72_class.png")


def usecase():
    fig, ax = canvas("ExamAI Use-Case Diagram",
                     "Student, teacher, and administrator functions within the ExamAI system boundary",
                     size=(13.5, 12), ylim=(0, 13.5))
    # UML-style dashed platform boundary; actors remain outside it.
    ax.add_patch(FancyBboxPatch((2.5,.55),9.4,11.75,boxstyle="round,pad=.02,rounding_size=0",
                    facecolor=WHITE,edgecolor=INK,linewidth=1.4,linestyle=(0,(6,4))))
    ax.text(7.2,12.0,"ExamAI Platform",ha="center",va="center",fontsize=12,weight="bold",color=INK)
    def actor(x,y,label):
        ax.add_patch(Ellipse((x,y+.5),.34,.34,facecolor=WHITE,edgecolor=INK,linewidth=1.3))
        ax.plot([x,x],[y+.33,y-.38],color=INK,lw=1.35)
        ax.plot([x-.31,x+.31],[y+.08,y+.08],color=INK,lw=1.35)
        ax.plot([x,x-.26],[y-.38,y-.78],color=INK,lw=1.35)
        ax.plot([x,x+.26],[y-.38,y-.78],color=INK,lw=1.35)
        ax.text(x,y-.98,label,ha="center",va="top",fontsize=9.2,weight="bold",color=INK)
    actor(1.25,9.32,"Student")
    actor(1.25,4.72,"Teacher")
    actor(12.9,8.7,"Admin")
    # One aligned column keeps each UML association independent and readable.
    cases=[(7.2,11.15,"Sign in / sign out"),(7.2,10.35,"View enrolled subjects"),
           (7.2,9.55,"Select approved materials"),(7.2,8.75,"Ask cited RAG questions"),
           (7.2,7.95,"Generate personal flashcards"),(7.2,7.15,"Take published quizzes"),
           (7.2,6.15,"Upload / manage materials"),(7.2,5.35,"Author / publish quizzes"),
           (7.2,4.55,"Review class analytics"),(7.2,3.75,"Generate quiz drafts"),
           (7.2,2.85,"Manage user accounts"),(7.2,2.05,"Manage subjects"),
           (7.2,1.25,"Assign teachers / enroll students")]
    for x,y,label in cases:
        ax.add_patch(Ellipse((x,y),3.5,.64,facecolor=WHITE,edgecolor=INK,linewidth=1.15))
        ax.text(x,y,label,ha="center",va="center",fontsize=8.2,color=INK,wrap=True)
    # Actor association lines are direct and role-specific, without arrowheads.
    # Compact actor trunks outside the boundary keep associations from crossing
    # through neighboring use-case ovals.
    ax.plot([1.55,2.3],[9.4,9.4],color=INK,lw=.75)
    ax.plot([2.3,2.3],[7.15,11.15],color=INK,lw=.75)
    for x,y,_ in cases[:6]:
        ax.plot([2.3,x-1.75],[y,y],color=INK,lw=.72)
    ax.plot([1.55,2.3],[4.8,4.8],color=INK,lw=.75)
    ax.plot([2.3,2.3],[3.75,6.15],color=INK,lw=.75)
    for x,y,_ in cases[6:10]:
        ax.plot([2.3,x-1.75],[y,y],color=INK,lw=.72)
    # Admin trunk on the right feeds the three administration ovals.
    ax.plot([12.6,12.1],[8.78,8.78],color=INK,lw=.75)
    ax.plot([12.1,12.1],[1.15,8.78],color=INK,lw=.75)
    for x,y,_ in cases[10:]:
        ax.plot([x+1.75,12.1],[y,y],color=INK,lw=.72)
    ax.text(7.2,.62,"Subject-scoped operations require teacher assignment or student enrollment; administration is gated by global require_admin.",
            ha="center",fontsize=7.8,color=GRAY,
            bbox=dict(facecolor=WHITE, edgecolor="none", pad=1.5, alpha=.95))
    save(fig,"fig73_usecase.png")


def sequence():
    fig, ax = canvas("RAG Chat Sequence Diagram",
                     "Selected-material retrieval with authorization and source attribution",
                     size=(13, 9.2), ylim=(0, 11))
    xs=[1.1,3.0,4.9,6.8,8.7,10.6,12.5]
    labels=["Student\nBrowser","FastAPI\nChat Route","Chat / Retrieval\nServices","Postgres\n(Supabase)","Local\nMiniLM","Qdrant\nCloud","LLM"]
    for x,l in zip(xs,labels):
        box(ax,x-.78,9.0,1.56,.9,l,fc=BLUE,title_size=8.5)
        ax.plot([x,x],[1.3,9.0],color="#8796A1",lw=.9,linestyle=(0,(3,3)))
    msgs=[(1.1,3.0,8.05,"Question + subject + selected material IDs"),
          (3.0,4.9,7.35,"Student-authenticated request"),
          (4.9,6.8,6.65,"Check enrollment + selected ready materials"),
          (6.8,4.9,6.05,"Authorized material IDs"),
          (4.9,8.7,5.45,"Embed question locally"),
          (8.7,4.9,4.95,"Query vector"),
          (4.9,10.6,4.35,"Query subject + material filter"),
          (10.6,4.9,3.75,"Ranked chunks + citation metadata"),
          (4.9,12.5,3.15,"Prompt with numbered context"),
          (12.5,4.9,2.55,"Answer text + source markers"),
          (4.9,4.9,1.95,"Resolve markers to teacher + source"),
          (4.9,3.0,1.45,"Answer + attributed citations"),
          (3.0,1.1,.95,"JSON response")]
    for i,(a,b,y,label) in enumerate(msgs):
        if a==b:
            ax.text(a+.55,y,label,ha="left",va="center",fontsize=7.2,color=INK,
                    bbox=dict(facecolor=WHITE,edgecolor="none",pad=1.2,alpha=.92))
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
    def task(x,y,text,fc=BLUE,w=3.0,h=.82):
        box(ax,x,y,w,h,text,fc=fc,title_size=7.1,radius=.14)
    # API validation and initial persistence precede the ingestion pipeline.
    task(.95,11.35,"Upload PDF / PPTX / DOCX")
    task(.95,9.95,"Validate teacher, subject,\nfile type and size")
    task(9.7,11.35,"Create processing\nrecord")
    task(9.7,9.95,"Upload to private\nStorage",fc=GREEN)
    task(5.35,9.95,"Parse text +\nsource locations")
    task(5.35,8.75,"Chunk by document\nformat")
    task(5.35,7.55,"Embed chunks\nlocally")
    task(9.7,7.55,"Upsert Qdrant\nvectors",fc=GREEN)
    task(5.35,6.15,"Recheck version /\nnot deleting")
    task(9.7,4.8,"Mark ready in Postgres",fc=GREEN)
    task(.95,4.8,"Show ready status")
    arrow(ax,2.45,11.35,2.45,10.77)
    arrow(ax,3.95,10.36,5.35,10.36,"uploaded bytes",label_offset=(0,.2))
    arrow(ax,3.95,10.36,9.7,11.35,rad=-.05)
    arrow(ax,11.2,11.35,11.2,10.77)
    arrow(ax,6.85,9.95,6.85,9.57)
    arrow(ax,6.85,8.75,6.85,8.57)
    arrow(ax,8.35,7.9,9.7,7.9)
    arrow(ax,9.7,7.55,8.35,6.5,rad=.08)
    # Version decision
    ax.add_patch(Polygon([[5.95,5.45],[6.85,5.9],[7.75,5.45],[6.85,5.0]],closed=True,facecolor=GOLD,edgecolor=NAVY,lw=1))
    ax.text(6.85,5.45,"Current?",ha="center",va="center",fontsize=7.5,weight="bold",color=NAVY)
    arrow(ax,6.85,6.15,6.85,5.9)
    arrow(ax,7.75,5.45,9.7,5.15,"Yes",label_offset=(0,.18))
    arrow(ax,9.7,5.15,3.95,5.15,rad=.08)
    task(5.35,2.5,"Mark failed in\nPostgres",fc=RED)
    task(9.7,2.5,"Best-effort source\nfile cleanup",fc=RED)
    arrow(ax,6.85,5.0,6.85,3.18,"stale / error",label_offset=(.55,0))
    arrow(ax,8.35,2.91,9.7,2.91)
    ax.text(7,.95,"Version guards keep stale workers from marking deleted or superseded materials ready.",
            ha="center",fontsize=8,color=GRAY)
    save(fig,"fig75_activity.png")


def dfd0():
    fig, ax = canvas("ExamAI Data Flow Diagram — Level 0",
                     "Context diagram: users interact with the ExamAI system and its external providers",
                     size=(12, 7.2), ylim=(0, 8.5))
    # entities and system
    box(ax,.45,6.15,2.25,.95,"Student","study, quiz, deck requests",fc=BLUE,detail_size=7.2)
    box(ax,.45,3.75,2.25,.95,"Administrator","user, subject, membership",fc=BLUE,detail_size=7.2)
    box(ax,.45,1.35,2.25,.95,"Teacher","materials, quizzes, analytics",fc=BLUE,detail_size=7.2)
    ax.add_patch(Ellipse((7,4.0),4.0,2.0,facecolor="#E6EFF5",edgecolor=NAVY,lw=1.8))
    ax.text(7,4.25,"0",ha="center",va="center",fontsize=10,color=GRAY)
    ax.text(7,3.85,"ExamAI Platform",ha="center",va="center",fontsize=13,weight="bold",color=NAVY)
    box(ax,11.25,6.15,2.3,.9,"Supabase","Auth · Postgres · Storage",fc=GREEN,detail_size=7.1)
    box(ax,11.25,3.75,2.3,.9,"Qdrant Cloud","filtered vector search",fc=GREEN,detail_size=7.1)
    box(ax,11.25,1.35,2.3,.9,"LLM","structured generation",fc=GREEN,detail_size=7.1)
    # Parallel lanes keep context flows separate and their labels readable.
    arrow(ax,2.7,6.62,5.0,4.75)
    ax.text(3.75,6.35,"study requests",fontsize=7.2,ha="center",bbox=dict(fc=WHITE,ec="none",pad=1))
    arrow(ax,5.0,4.55,2.7,6.25,rad=.12)
    ax.text(3.7,5.18,"answers, citations, scores, decks",fontsize=6.9,ha="center",bbox=dict(fc=WHITE,ec="none",pad=1))
    arrow(ax,2.7,4.22,5.0,4.08)
    ax.text(3.8,4.35,"admin requests",fontsize=7.1,ha="center",bbox=dict(fc=WHITE,ec="none",pad=1))
    arrow(ax,5.0,3.82,2.7,3.92)
    ax.text(3.8,3.63,"managed records",fontsize=7.1,ha="center",bbox=dict(fc=WHITE,ec="none",pad=1))
    arrow(ax,2.7,1.8,5.0,3.15)
    ax.text(3.8,2.65,"uploads, quiz authoring",fontsize=7,ha="center",bbox=dict(fc=WHITE,ec="none",pad=1))
    arrow(ax,5.0,3.0,2.7,1.65,rad=.1)
    ax.text(3.8,2.0,"status, analytics",fontsize=7,ha="center",bbox=dict(fc=WHITE,ec="none",pad=1))
    arrow(ax,9.0,4.75,11.25,6.55)
    ax.text(10.05,5.85,"identity, records, files",fontsize=7,ha="center",bbox=dict(fc=WHITE,ec="none",pad=1))
    arrow(ax,11.25,6.25,9.0,4.45,rad=.08)
    ax.text(10.15,4.98,"authorized reads / writes",fontsize=7,ha="center",bbox=dict(fc=WHITE,ec="none",pad=1))
    arrow(ax,9.0,4.0,11.25,4.0)
    ax.text(10.1,4.18,"filtered query",fontsize=7,ha="center",bbox=dict(fc=WHITE,ec="none",pad=1))
    arrow(ax,11.25,3.8,9.0,3.8)
    ax.text(10.1,3.58,"ranked chunks",fontsize=7,ha="center",bbox=dict(fc=WHITE,ec="none",pad=1))
    arrow(ax,8.75,3.3,11.25,1.8)
    ax.text(10.0,2.8,"generation prompt",fontsize=7,ha="center",bbox=dict(fc=WHITE,ec="none",pad=1))
    arrow(ax,11.25,1.6,8.75,3.05,rad=.08)
    ax.text(10.0,2.05,"structured output",fontsize=7,ha="center",bbox=dict(fc=WHITE,ec="none",pad=1))
    save(fig,"fig761_dfd0.png")


def dfd1():
    fig, ax = canvas("ExamAI Data Flow Diagram — Level 1", None,
                     size=(17, 9), ylim=(0, 9), xlim=(0, 17))

    def actor(x, y, title, detail, w=1.9):
        box(ax, x, y, w, .82, title, detail, fc=BLUE, title_size=9,
            detail_size=7, radius=.03)

    def process(cx, cy, number, label, w=2.55):
        ax.add_patch(Ellipse((cx, cy), w, 1.0, facecolor=WHITE,
                             edgecolor=NAVY, lw=1.3))
        ax.text(cx, cy+.2, number, ha="center", va="center", fontsize=8,
                weight="bold", color=GRAY)
        ax.text(cx, cy-.12, label, ha="center", va="center", fontsize=8.2,
                weight="bold", color=NAVY, wrap=True)

    actor(.4, 1.5, "Teacher", "materials + quizzes", w=2.1)
    actor(6.7, 6.95, "Student", "chat + quizzes + flashcards", w=2.9)
    actor(14.8, 1.5, "Administrator", "accounts + subjects", w=1.9)

    # The learning workflow runs left to right through connected processes.
    process(4.5, 5.0, "1.0", "Prepare learning\ncontent", w=2.7)
    process(8.5, 5.0, "2.0", "Student study\n+ assessment", w=2.7)
    process(12.5, 5.0, "3.0", "Review class\nprogress", w=2.7)
    process(12.5, 1.8, "4.0", "Manage users\n+ membership", w=2.7)

    # Teacher materials and quiz authoring feed the learning workflow.
    arrow(ax, 2.5, 2.15, 3.3, 4.62,
          "materials + quiz authoring", label_offset=(-.35,.08), lw=1)
    arrow(ax, 11.35, 4.58, 2.5, 1.85,
          "class analytics", rad=-.08, label_offset=(0,-.27), lw=1)

    # Student requests enter the study process; learning results return.
    arrow(ax, 7.85, 6.95, 8.35, 5.53,
          "study requests + quiz answers", rad=.12, label_offset=(-1.05,.32), lw=1)
    arrow(ax, 8.7, 5.53, 8.3, 6.95,
          "answers + citations + scores + decks", rad=.12, label_offset=(1.15,-.32), lw=1)

    # Content flows into student study and assessment outcomes feed analytics.
    arrow(ax, 5.85, 5.0, 7.15, 5.0,
          "approved content + quizzes", label_offset=(0,.3), lw=1.05)
    arrow(ax, 9.85, 5.0, 11.15, 5.0,
          "quiz attempts + progress", label_offset=(0,.3), lw=1.05)

    # Subject membership informs class-progress review; administrators manage it.
    arrow(ax, 12.5, 2.3, 12.5, 4.5,
          "subject membership", label_offset=(1.35,0), lw=1)
    arrow(ax, 14.8, 1.92, 13.85, 1.92,
          "requests", label_offset=(0,.22), lw=1)
    arrow(ax, 13.85, 1.65, 14.8, 1.65,
          "records", label_offset=(0,-.22), lw=1)

    save(fig, "fig762_dfd1.png")


if __name__ == "__main__":
    architecture()
    class_diagram()
    usecase()
    sequence()
    activity()
    dfd0()
    dfd1()
    print(f"Generated seven ExamAI report figures in {OUT}")
