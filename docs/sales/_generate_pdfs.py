"""Generate professional, branded PDFs from the MyLeadX sales markdown docs.

ENHANCED VERSION with:
- Pie charts and bar charts
- Stat cards for key metrics
- Progress bars
- Icon bullets
- Highlight boxes
- Better visual hierarchy

Palette:
  navy       #0A2540   primary
  navy_soft  #1E3A5F   secondary
  gold       #F5A623   accent
  mist       #F7F9FC   light panel
  slate      #64748B   muted text
  ink        #1F2937   body text
  rule       #E2E8F0   hairlines
  good       #10B981   success ticks
  danger     #EF4444   warning/alert
  info       #3B82F6   info blue
"""

import os
import re
import math
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    KeepTogether,
    ListFlowable,
    ListItem,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Preformatted,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.graphics.shapes import Drawing, Rect, String, Circle, Polygon, Line
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics import renderPDF

# ---------- palette ---------------------------------------------------------

NAVY = colors.HexColor("#0A2540")
NAVY_SOFT = colors.HexColor("#1E3A5F")
GOLD = colors.HexColor("#F5A623")
MIST = colors.HexColor("#F7F9FC")
SLATE = colors.HexColor("#64748B")
INK = colors.HexColor("#1F2937")
RULE = colors.HexColor("#E2E8F0")
GOOD = colors.HexColor("#10B981")
DANGER = colors.HexColor("#EF4444")
INFO = colors.HexColor("#3B82F6")
CARD = colors.HexColor("#FFFFFF")
BAND = colors.HexColor("#EEF2F8")
PURPLE = colors.HexColor("#8B5CF6")
ORANGE = colors.HexColor("#F97316")
TEAL = colors.HexColor("#14B8A6")

# Chart colors
CHART_COLORS = [NAVY, GOLD, GOOD, INFO, PURPLE, ORANGE, TEAL, DANGER]

HERE = os.path.dirname(os.path.abspath(__file__))

# ---------- shared styles ---------------------------------------------------

styles = getSampleStyleSheet()

S_BODY = ParagraphStyle(
    "Body", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=10.5, leading=15, textColor=INK, spaceAfter=6,
)
S_BODY_TIGHT = ParagraphStyle("BodyTight", parent=S_BODY, spaceAfter=2)
S_H1 = ParagraphStyle(
    "H1", parent=S_BODY, fontName="Helvetica-Bold", fontSize=20,
    leading=24, textColor=NAVY, spaceBefore=6, spaceAfter=8,
)
S_H2 = ParagraphStyle(
    "H2", parent=S_BODY, fontName="Helvetica-Bold", fontSize=15,
    leading=19, textColor=NAVY, spaceBefore=16, spaceAfter=6,
)
S_H3 = ParagraphStyle(
    "H3", parent=S_BODY, fontName="Helvetica-Bold", fontSize=12,
    leading=16, textColor=NAVY_SOFT, spaceBefore=10, spaceAfter=4,
)
S_H4 = ParagraphStyle(
    "H4", parent=S_BODY, fontName="Helvetica-Bold", fontSize=10.5,
    leading=14, textColor=GOLD, spaceBefore=6, spaceAfter=2,
)
S_BULLET = ParagraphStyle(
    "Bullet", parent=S_BODY, leftIndent=14, bulletIndent=2, spaceAfter=3,
)
S_NUM = ParagraphStyle(
    "Num", parent=S_BODY, leftIndent=18, bulletIndent=2, spaceAfter=3,
)
S_QUOTE = ParagraphStyle(
    "Quote", parent=S_BODY, fontName="Helvetica-Oblique",
    fontSize=11, leading=16, textColor=NAVY_SOFT,
    leftIndent=10, rightIndent=10,
)
S_SMALL = ParagraphStyle(
    "Small", parent=S_BODY, fontSize=8.5, leading=11, textColor=SLATE,
)
S_COVER_TITLE = ParagraphStyle(
    "CoverTitle", parent=S_BODY, fontName="Helvetica-Bold",
    fontSize=34, leading=40, textColor=colors.white, alignment=TA_LEFT,
)
S_COVER_SUB = ParagraphStyle(
    "CoverSub", parent=S_BODY, fontName="Helvetica",
    fontSize=14, leading=20, textColor=colors.HexColor("#DBE4F0"),
    alignment=TA_LEFT,
)
S_COVER_META = ParagraphStyle(
    "CoverMeta", parent=S_BODY, fontName="Helvetica",
    fontSize=10, leading=14, textColor=colors.HexColor("#DBE4F0"),
    alignment=TA_LEFT,
)
S_COVER_EYEBROW = ParagraphStyle(
    "Eyebrow", parent=S_BODY, fontName="Helvetica-Bold",
    fontSize=10, leading=14, textColor=GOLD, alignment=TA_LEFT,
)
S_TABLE_HEAD = ParagraphStyle(
    "TH", parent=S_BODY, fontName="Helvetica-Bold", fontSize=9.5,
    leading=12, textColor=colors.white, alignment=TA_LEFT, spaceAfter=0,
)
S_TABLE_CELL = ParagraphStyle(
    "TD", parent=S_BODY, fontSize=9.5, leading=12, spaceAfter=0,
)
S_STAT_VALUE = ParagraphStyle(
    "StatValue", parent=S_BODY, fontName="Helvetica-Bold",
    fontSize=24, leading=28, textColor=NAVY, alignment=TA_CENTER,
)
S_STAT_LABEL = ParagraphStyle(
    "StatLabel", parent=S_BODY, fontName="Helvetica",
    fontSize=9, leading=12, textColor=SLATE, alignment=TA_CENTER,
)


# ---------- NEW: Enhanced Flowables -----------------------------------------

class StatCard(Flowable):
    """A card showing a key statistic with value, label, and optional trend."""

    def __init__(self, value, label, trend=None, color=NAVY, width=80, height=70):
        super().__init__()
        self.value = value
        self.label = label
        self.trend = trend  # '+15%' or '-5%' etc.
        self.color = color
        self.width = width
        self.height = height

    def wrap(self, availWidth, availHeight):
        return self.width, self.height

    def draw(self):
        c = self.canv
        # Background card
        c.setFillColor(colors.white)
        c.setStrokeColor(RULE)
        c.setLineWidth(1)
        c.roundRect(0, 0, self.width, self.height, 6, fill=1, stroke=1)

        # Top accent line
        c.setFillColor(self.color)
        c.rect(0, self.height - 4, self.width, 4, fill=1, stroke=0)

        # Value
        c.setFillColor(self.color)
        c.setFont("Helvetica-Bold", 20)
        c.drawCentredString(self.width / 2, self.height - 32, self.value)

        # Label
        c.setFillColor(SLATE)
        c.setFont("Helvetica", 8)
        c.drawCentredString(self.width / 2, self.height - 48, self.label)

        # Trend indicator
        if self.trend:
            trend_color = GOOD if self.trend.startswith('+') else DANGER
            c.setFillColor(trend_color)
            c.setFont("Helvetica-Bold", 9)
            c.drawCentredString(self.width / 2, 8, self.trend)


class StatCardRow(Flowable):
    """A row of stat cards."""

    def __init__(self, stats, width):
        super().__init__()
        self.stats = stats  # List of (value, label, trend, color) tuples
        self.total_width = width
        self.card_height = 70
        self.spacing = 10

    def wrap(self, availWidth, availHeight):
        return self.total_width, self.card_height + 10

    def draw(self):
        c = self.canv
        num_cards = len(self.stats)
        card_width = (self.total_width - (num_cards - 1) * self.spacing) / num_cards

        x = 0
        for stat in self.stats:
            value, label, trend, color = stat
            card = StatCard(value, label, trend, color, card_width, self.card_height)
            card.canv = c
            c.saveState()
            c.translate(x, 0)
            card.draw()
            c.restoreState()
            x += card_width + self.spacing


class ProgressBar(Flowable):
    """A horizontal progress bar with label."""

    def __init__(self, label, value, max_value=100, width=200, color=NAVY):
        super().__init__()
        self.label = label
        self.value = value
        self.max_value = max_value
        self.width = width
        self.color = color
        self.height = 30

    def wrap(self, availWidth, availHeight):
        return self.width, self.height

    def draw(self):
        c = self.canv
        bar_height = 10
        bar_y = 5

        # Label
        c.setFillColor(INK)
        c.setFont("Helvetica", 9)
        c.drawString(0, self.height - 8, self.label)

        # Value percentage
        c.setFont("Helvetica-Bold", 9)
        c.drawRightString(self.width, self.height - 8, f"{self.value}%")

        # Background bar
        c.setFillColor(MIST)
        c.roundRect(0, bar_y, self.width, bar_height, 3, fill=1, stroke=0)

        # Progress bar
        progress_width = (self.value / self.max_value) * self.width
        c.setFillColor(self.color)
        c.roundRect(0, bar_y, progress_width, bar_height, 3, fill=1, stroke=0)


class HighlightBox(Flowable):
    """A highlighted box for important information."""

    def __init__(self, text, box_type='info', width=400):
        super().__init__()
        self.text = text
        self.box_type = box_type  # 'info', 'success', 'warning', 'tip'
        self.width = width
        self._h = 0

        self.colors = {
            'info': (INFO, colors.HexColor("#EFF6FF")),
            'success': (GOOD, colors.HexColor("#ECFDF5")),
            'warning': (GOLD, colors.HexColor("#FFFBEB")),
            'danger': (DANGER, colors.HexColor("#FEF2F2")),
            'tip': (PURPLE, colors.HexColor("#F5F3FF")),
        }
        self.icons = {
            'info': 'ℹ',
            'success': '✓',
            'warning': '⚠',
            'danger': '✗',
            'tip': '💡',
        }

    def wrap(self, availWidth, availHeight):
        self.width = availWidth
        # Estimate text height
        lines = len(self.text) / 60 + 1
        self._h = max(40, lines * 14 + 20)
        return self.width, self._h

    def draw(self):
        c = self.canv
        accent_color, bg_color = self.colors.get(self.box_type, (INFO, MIST))
        icon = self.icons.get(self.box_type, 'ℹ')

        # Background
        c.setFillColor(bg_color)
        c.setStrokeColor(accent_color)
        c.setLineWidth(0.5)
        c.roundRect(0, 0, self.width, self._h, 4, fill=1, stroke=1)

        # Left accent bar
        c.setFillColor(accent_color)
        c.rect(0, 0, 4, self._h, fill=1, stroke=0)

        # Icon circle
        c.setFillColor(accent_color)
        c.circle(20, self._h / 2, 10, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 12)
        c.drawCentredString(20, self._h / 2 - 4, icon)

        # Text
        c.setFillColor(INK)
        c.setFont("Helvetica", 10)
        # Simple text wrap
        words = self.text.split()
        lines = []
        current_line = []
        for word in words:
            current_line.append(word)
            if len(' '.join(current_line)) > 70:
                lines.append(' '.join(current_line[:-1]))
                current_line = [word]
        if current_line:
            lines.append(' '.join(current_line))

        y = self._h - 15
        for line in lines[:3]:  # Max 3 lines
            c.drawString(38, y, line)
            y -= 14


class SectionDivider(Flowable):
    """A decorative section divider."""

    def __init__(self, title, width, color=NAVY):
        super().__init__()
        self.title = title
        self.width = width
        self.color = color
        self.height = 40

    def wrap(self, availWidth, availHeight):
        return self.width, self.height

    def draw(self):
        c = self.canv

        # Background band
        c.setFillColor(self.color)
        c.roundRect(0, 5, self.width, 30, 4, fill=1, stroke=0)

        # Title text
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(15, 17, self.title.upper())

        # Decorative element
        c.setFillColor(GOLD)
        c.rect(self.width - 60, 15, 50, 3, fill=1, stroke=0)


class IconBulletList(Flowable):
    """A list with custom icons instead of bullets."""

    def __init__(self, items, width, icon='✓', icon_color=GOOD):
        super().__init__()
        self.items = items  # List of strings
        self.width = width
        self.icon = icon
        self.icon_color = icon_color
        self._h = 0

    def wrap(self, availWidth, availHeight):
        self.width = availWidth
        self._h = len(self.items) * 20 + 10
        return self.width, self._h

    def draw(self):
        c = self.canv
        y = self._h - 15

        for item in self.items:
            # Icon
            c.setFillColor(self.icon_color)
            c.setFont("Helvetica-Bold", 12)
            c.drawString(5, y, self.icon)

            # Text
            c.setFillColor(INK)
            c.setFont("Helvetica", 10)
            c.drawString(25, y, item[:80])  # Truncate long items

            y -= 20


class MiniPieChart(Flowable):
    """A small pie chart for visual data representation."""

    def __init__(self, data, labels, title="", width=150, height=120):
        super().__init__()
        self.data = data  # List of values
        self.labels = labels  # List of labels
        self.title = title
        self.width = width
        self.height = height

    def wrap(self, availWidth, availHeight):
        return self.width, self.height

    def draw(self):
        c = self.canv

        # Title
        if self.title:
            c.setFillColor(NAVY)
            c.setFont("Helvetica-Bold", 10)
            c.drawCentredString(self.width / 2, self.height - 10, self.title)

        # Create pie chart
        d = Drawing(self.width, self.height - 20)
        pie = Pie()
        pie.x = self.width / 2 - 35
        pie.y = 10
        pie.width = 70
        pie.height = 70
        pie.data = self.data
        pie.labels = self.labels

        # Colors
        for i, color in enumerate(CHART_COLORS[:len(self.data)]):
            pie.slices[i].fillColor = color
            pie.slices[i].strokeColor = colors.white
            pie.slices[i].strokeWidth = 1

        d.add(pie)
        renderPDF.draw(d, c, 0, 0)


class MiniBarChart(Flowable):
    """A small bar chart for comparisons."""

    def __init__(self, data, labels, title="", width=200, height=100):
        super().__init__()
        self.data = data  # List of values
        self.labels = labels  # List of labels
        self.title = title
        self.width = width
        self.height = height

    def wrap(self, availWidth, availHeight):
        return self.width, self.height

    def draw(self):
        c = self.canv

        # Title
        if self.title:
            c.setFillColor(NAVY)
            c.setFont("Helvetica-Bold", 10)
            c.drawCentredString(self.width / 2, self.height - 10, self.title)

        # Simple bar chart
        max_val = max(self.data) if self.data else 1
        bar_width = (self.width - 40) / len(self.data) - 5
        x = 20

        for i, (val, label) in enumerate(zip(self.data, self.labels)):
            bar_height = (val / max_val) * (self.height - 45)

            # Bar
            c.setFillColor(CHART_COLORS[i % len(CHART_COLORS)])
            c.rect(x, 25, bar_width, bar_height, fill=1, stroke=0)

            # Value on top
            c.setFillColor(NAVY)
            c.setFont("Helvetica-Bold", 8)
            c.drawCentredString(x + bar_width / 2, 25 + bar_height + 3, str(val))

            # Label below
            c.setFillColor(SLATE)
            c.setFont("Helvetica", 7)
            short_label = label[:8] + '..' if len(label) > 10 else label
            c.drawCentredString(x + bar_width / 2, 10, short_label)

            x += bar_width + 5


class ComparisonTable(Flowable):
    """A visual comparison table with checkmarks."""

    def __init__(self, headers, rows, width):
        super().__init__()
        self.headers = headers  # ['Feature', 'Us', 'Competitor']
        self.rows = rows  # [('Feature Name', True, False), ...]
        self.width = width
        self._h = 0

    def wrap(self, availWidth, availHeight):
        self.width = availWidth
        self._h = (len(self.rows) + 1) * 25 + 10
        return self.width, self._h

    def draw(self):
        c = self.canv
        col_width = self.width / len(self.headers)
        row_height = 25
        y = self._h - 5

        # Header
        c.setFillColor(NAVY)
        c.rect(0, y - row_height, self.width, row_height, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 10)
        for i, header in enumerate(self.headers):
            c.drawCentredString(i * col_width + col_width / 2, y - 17, header)
        y -= row_height

        # Rows
        for row_idx, row in enumerate(self.rows):
            # Zebra striping
            if row_idx % 2 == 0:
                c.setFillColor(MIST)
                c.rect(0, y - row_height, self.width, row_height, fill=1, stroke=0)

            for i, cell in enumerate(row):
                if i == 0:
                    # Text cell
                    c.setFillColor(INK)
                    c.setFont("Helvetica", 9)
                    c.drawString(10, y - 17, str(cell)[:30])
                else:
                    # Boolean cell
                    if cell is True or cell == '✓':
                        c.setFillColor(GOOD)
                        c.setFont("Helvetica-Bold", 14)
                        c.drawCentredString(i * col_width + col_width / 2, y - 18, '✓')
                    elif cell is False or cell == '✗':
                        c.setFillColor(DANGER)
                        c.setFont("Helvetica-Bold", 14)
                        c.drawCentredString(i * col_width + col_width / 2, y - 18, '✗')
                    else:
                        c.setFillColor(INK)
                        c.setFont("Helvetica", 9)
                        c.drawCentredString(i * col_width + col_width / 2, y - 17, str(cell))

            y -= row_height


# ---------- cover page flowables --------------------------------------------

def paint_cover_background(canvas):
    """Draw the full-bleed navy panel + brand marks on the cover page."""
    c = canvas
    w, h = PAGE_W, PAGE_H
    c.saveState()

    # Main background
    c.setFillColor(NAVY)
    c.rect(0, 0, w, h, fill=1, stroke=0)

    # Decorative shapes
    c.setFillColor(NAVY_SOFT)
    c.rect(0, h * 0.18, w, h * 0.16, fill=1, stroke=0)

    # Abstract geometric decoration (top right)
    c.setFillColor(colors.HexColor("#162D4D"))
    c.circle(w - 30 * mm, h - 40 * mm, 80, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#1A3A5C"))
    c.circle(w - 50 * mm, h - 60 * mm, 50, fill=1, stroke=0)

    # Gold accent stripe above the eyebrow
    c.setFillColor(GOLD)
    c.rect(20 * mm, h * 0.60, 48 * mm, 4, fill=1, stroke=0)

    # Additional gold accent (bottom right)
    c.setFillColor(GOLD)
    c.rect(w - 80 * mm, 40 * mm, 60 * mm, 2, fill=1, stroke=0)

    # Brandmark top-left
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(20 * mm, h - 20 * mm, "MyLeadX.ai")
    c.setFillColor(colors.HexColor("#8FA3BF"))
    c.setFont("Helvetica", 9)
    c.drawString(20 * mm, h - 26 * mm, "AI-Powered Lead Management Platform")

    # Version badge
    c.setFillColor(GOLD)
    c.roundRect(20 * mm, h - 42 * mm, 35 * mm, 8 * mm, 2, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(37.5 * mm, h - 39 * mm, "2025 EDITION")

    # Footer on cover
    c.setStrokeColor(colors.HexColor("#24456F"))
    c.setLineWidth(0.6)
    c.line(20 * mm, 28 * mm, w - 20 * mm, 28 * mm)
    c.setFillColor(colors.HexColor("#8FA3BF"))
    c.setFont("Helvetica", 8.5)
    c.drawString(20 * mm, 22 * mm, "www.myleadx.ai   |   sales@myleadx.ai   |   +91-XXXX-XXXXXX")
    c.drawRightString(
        w - 20 * mm, 22 * mm,
        f"Generated: {datetime.now().strftime('%d %B %Y')}",
    )
    c.restoreState()


class HRule(Flowable):
    """Thin horizontal rule with a bit of vertical breathing room."""

    def __init__(self, width, color=RULE, thickness=0.6, pad=6):
        super().__init__()
        self.width = width
        self.color = color
        self.thickness = thickness
        self.pad = pad

    def wrap(self, *args):
        return self.width, self.pad * 2

    def draw(self):
        c = self.canv
        c.setStrokeColor(self.color)
        c.setLineWidth(self.thickness)
        c.line(0, self.pad, self.width, self.pad)


class GradientRule(Flowable):
    """A gradient horizontal rule with fade effect."""

    def __init__(self, width, color=GOLD, thickness=3, pad=8):
        super().__init__()
        self.width = width
        self.color = color
        self.thickness = thickness
        self.pad = pad

    def wrap(self, *args):
        return self.width, self.pad * 2

    def draw(self):
        c = self.canv
        # Draw gradient effect with multiple lines
        steps = 20
        for i in range(steps):
            alpha = 1 - (i / steps) * 0.8
            c.setStrokeColor(self.color)
            c.setLineWidth(self.thickness * alpha)
            x_start = (i / steps) * self.width * 0.3
            c.line(x_start, self.pad, self.width * 0.4, self.pad)


class Callout(Flowable):
    """Tinted left-border callout box for testimonials/blockquotes."""

    def __init__(self, paragraphs, width):
        super().__init__()
        self.paragraphs = paragraphs
        self.width = width
        self._h = 0

    def wrap(self, availWidth, availHeight):
        self.width = availWidth
        inner_w = availWidth - 20
        total_h = 0
        for p in self.paragraphs:
            _, h = p.wrap(inner_w, availHeight)
            total_h += h + 2
        self._h = total_h + 14
        return availWidth, self._h

    def draw(self):
        c = self.canv
        # background
        c.setFillColor(MIST)
        c.setStrokeColor(RULE)
        c.setLineWidth(0.4)
        c.roundRect(0, 0, self.width, self._h, 4, fill=1, stroke=1)
        # gold left border
        c.setFillColor(GOLD)
        c.rect(0, 0, 3, self._h, fill=1, stroke=0)
        # Quote icon
        c.setFillColor(GOLD)
        c.setFont("Helvetica-Bold", 24)
        c.drawString(10, self._h - 20, '"')
        # paragraphs inside
        y = self._h - 10
        inner_w = self.width - 30
        for p in self.paragraphs:
            _, h = p.wrap(inner_w, 10000)
            y -= h
            p.drawOn(c, 24, y)
            y -= 2


# ---------- page frames -----------------------------------------------------

PAGE_W, PAGE_H = A4
MARGIN_L = 20 * mm
MARGIN_R = 20 * mm
MARGIN_T = 24 * mm
MARGIN_B = 22 * mm


def _header_footer(canvas, doc, doc_title):
    canvas.saveState()
    # header band with gradient effect
    canvas.setFillColor(NAVY)
    canvas.rect(0, PAGE_H - 14 * mm, PAGE_W, 14 * mm, fill=1, stroke=0)
    canvas.setFillColor(GOLD)
    canvas.rect(0, PAGE_H - 14 * mm - 2, PAGE_W, 2, fill=1, stroke=0)

    # Brand name with icon
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 11)
    canvas.drawString(MARGIN_L, PAGE_H - 9 * mm, "◆ MyLeadX.ai")

    canvas.setFont("Helvetica", 9)
    canvas.setFillColor(colors.HexColor("#C7D3E5"))
    canvas.drawRightString(PAGE_W - MARGIN_R, PAGE_H - 9 * mm, doc_title)

    # footer with enhanced styling
    canvas.setStrokeColor(RULE)
    canvas.setLineWidth(0.4)
    canvas.line(MARGIN_L, 14 * mm, PAGE_W - MARGIN_R, 14 * mm)
    canvas.setFillColor(SLATE)
    canvas.setFont("Helvetica", 8.5)
    canvas.drawString(MARGIN_L, 9 * mm, "Confidential | © 2025 MyLeadX Technologies Pvt. Ltd.")

    # Page number with styling
    page_num = canvas.getPageNumber()
    canvas.setFillColor(NAVY)
    canvas.circle(PAGE_W - MARGIN_R - 10, 10 * mm, 8, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawCentredString(PAGE_W - MARGIN_R - 10, 8 * mm, str(page_num))

    canvas.restoreState()


def _cover_decoration(canvas, doc):
    paint_cover_background(canvas)


class SalesDocTemplate(BaseDocTemplate):
    def __init__(self, filename, doc_title):
        super().__init__(
            filename, pagesize=A4,
            leftMargin=MARGIN_L, rightMargin=MARGIN_R,
            topMargin=MARGIN_T, bottomMargin=MARGIN_B,
            title=doc_title, author="MyLeadX Technologies Pvt. Ltd.",
            subject=doc_title,
        )
        self.doc_title = doc_title
        # cover uses full page, no margins
        cover_frame = Frame(0, 0, PAGE_W, PAGE_H, id="cover",
                            leftPadding=0, rightPadding=0,
                            topPadding=0, bottomPadding=0)
        body_frame = Frame(
            MARGIN_L, MARGIN_B,
            PAGE_W - MARGIN_L - MARGIN_R, PAGE_H - MARGIN_T - MARGIN_B,
            id="body",
            leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0,
        )
        self.addPageTemplates([
            PageTemplate(id="cover", frames=[cover_frame],
                         onPage=_cover_decoration),
            PageTemplate(
                id="body", frames=[body_frame],
                onPage=lambda c, d: _header_footer(c, d, doc_title),
            ),
        ])


# ---------- markdown -> flowables (narrow subset) ---------------------------

_INLINE_BOLD = re.compile(r"\*\*(.+?)\*\*")
_INLINE_ITAL = re.compile(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)")
_INLINE_CODE = re.compile(r"`([^`]+)`")
_INLINE_LINK = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")


def md_inline(text):
    """Convert a line of markdown to the tiny XML markup reportlab understands."""
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    text = _INLINE_CODE.sub(
        lambda m: f'<font name="Courier" color="#0A2540">{m.group(1)}</font>',
        text,
    )
    text = _INLINE_BOLD.sub(r"<b>\1</b>", text)
    text = _INLINE_ITAL.sub(r"<i>\1</i>", text)
    text = _INLINE_LINK.sub(
        lambda m: f'<font color="#0A2540"><u>{m.group(1)}</u></font>', text,
    )
    # Replace checkmarks and x marks with colored versions
    text = text.replace("✓", '<font color="#10B981"><b>✓</b></font>')
    text = text.replace("✗", '<font color="#EF4444"><b>✗</b></font>')
    text = text.replace("✅", '<font color="#10B981"><b>✓</b></font>')
    text = text.replace("❌", '<font color="#EF4444"><b>✗</b></font>')
    return text


def _is_table_sep(line):
    s = line.strip()
    if not s.startswith("|"):
        return False
    return bool(re.match(r"^\|[\s:\-|]+\|\s*$", s))


def _parse_table(lines, start):
    """Return (rows, new_index). Rows are lists of raw cell strings."""
    rows = []
    i = start
    while i < len(lines) and lines[i].strip().startswith("|"):
        row = lines[i].strip()
        # strip leading/trailing pipes then split
        row = row[1:-1] if row.endswith("|") else row[1:]
        cells = [c.strip() for c in row.split("|")]
        rows.append(cells)
        i += 1
    return rows, i


def _styled_table(raw_rows, avail_width):
    """Turn parsed markdown rows into a reportlab Table with enhanced styling."""
    # Drop the separator row (the |---|---| line) — detected by --- pattern.
    cleaned = []
    for r in raw_rows:
        joined = "".join(r)
        if re.match(r"^[\s:\-]+$", joined):
            continue
        cleaned.append(r)
    if not cleaned:
        return None

    header, *body = cleaned
    # normalise column counts
    cols = max(len(row) for row in cleaned)
    header = header + [""] * (cols - len(header))
    body = [row + [""] * (cols - len(row)) for row in body]

    header_cells = [Paragraph(md_inline(c) or "&nbsp;", S_TABLE_HEAD) for c in header]
    body_cells = [
        [Paragraph(md_inline(c) or "&nbsp;", S_TABLE_CELL) for c in row]
        for row in body
    ]
    data = [header_cells] + body_cells

    # Share the width evenly unless first column is clearly a "label column"
    col_widths = [avail_width / cols] * cols
    if cols >= 3:
        col_widths[0] = avail_width * 0.28
        rest = (avail_width - col_widths[0]) / (cols - 1)
        for i in range(1, cols):
            col_widths[i] = rest

    t = Table(data, colWidths=col_widths, repeatRows=1)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9.5),
        ("ALIGN", (0, 0), (-1, 0), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, GOLD),  # Gold line under header
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BAND]),
        ("LINEBELOW", (0, 1), (-1, -1), 0.25, RULE),
        ("BOX", (0, 0), (-1, -1), 0.5, NAVY_SOFT),  # Navy border
        ("ROUNDEDCORNERS", [3, 3, 3, 3]),
    ]
    t.setStyle(TableStyle(style))
    return t


def md_to_flowables(md_text, avail_width):
    """Produce a flowable list from markdown text. Very narrow subset."""
    flow = []
    lines = md_text.splitlines()
    i = 0
    in_code = False
    code_buf = []

    def flush_code():
        if code_buf:
            code_text = "\n".join(code_buf)
            pre = Preformatted(
                code_text,
                ParagraphStyle(
                    "Code", fontName="Courier", fontSize=8.5, leading=11,
                    textColor=NAVY, backColor=MIST, borderColor=NAVY_SOFT,
                    borderWidth=0.5, borderPadding=10, leftIndent=0,
                    borderRadius=4,
                ),
            )
            flow.append(pre)
            flow.append(Spacer(1, 8))
        code_buf.clear()

    while i < len(lines):
        raw = lines[i]
        line = raw.rstrip()

        if line.strip().startswith("```"):
            if in_code:
                flush_code()
                in_code = False
            else:
                in_code = True
            i += 1
            continue

        if in_code:
            code_buf.append(raw)
            i += 1
            continue

        stripped = line.strip()

        # blank
        if not stripped:
            i += 1
            continue

        # horizontal rule
        if re.match(r"^-{3,}$", stripped):
            flow.append(GradientRule(avail_width, GOLD))
            i += 1
            continue

        # headings (the first # is always the cover title, already rendered)
        if stripped.startswith("#### "):
            flow.append(Paragraph(md_inline(stripped[5:]), S_H4))
            i += 1
            continue
        if stripped.startswith("### "):
            flow.append(Spacer(1, 4))
            flow.append(Paragraph(md_inline(stripped[4:]), S_H3))
            i += 1
            continue
        if stripped.startswith("## "):
            # Add a subtle divider before H2
            flow.append(Spacer(1, 8))
            flow.append(Paragraph(md_inline(stripped[3:]), S_H2))
            flow.append(Spacer(1, 2))
            i += 1
            continue
        if stripped.startswith("# "):
            flow.append(Paragraph(md_inline(stripped[2:]), S_H1))
            i += 1
            continue

        # block quote
        if stripped.startswith("> "):
            buf = []
            while i < len(lines) and lines[i].strip().startswith("> "):
                buf.append(lines[i].strip()[2:])
                i += 1
            para = Paragraph(md_inline(" ".join(buf)), S_QUOTE)
            flow.append(Callout([para], avail_width))
            flow.append(Spacer(1, 6))
            continue

        # table
        if stripped.startswith("|") and i + 1 < len(lines) and _is_table_sep(lines[i + 1]):
            rows, i = _parse_table(lines, i)
            t = _styled_table(rows, avail_width)
            if t is not None:
                flow.append(Spacer(1, 6))
                flow.append(t)
                flow.append(Spacer(1, 10))
            continue

        # bullet list
        if stripped.startswith("- ") or stripped.startswith("* "):
            items = []
            while i < len(lines):
                s = lines[i].strip()
                if s.startswith("- ") or s.startswith("* "):
                    items.append(Paragraph(md_inline(s[2:]), S_BULLET))
                    i += 1
                elif s == "":
                    break
                else:
                    break
            flow.append(ListFlowable(
                [ListItem(p, leftIndent=14, bulletColor=GOLD) for p in items],
                bulletType="bullet", bulletFontName="Helvetica-Bold",
                bulletFontSize=9, leftIndent=14, bulletColor=GOLD,
                start="◆",  # Diamond bullet
            ))
            flow.append(Spacer(1, 6))
            continue

        # numbered list
        if re.match(r"^\d+\.\s", stripped):
            items = []
            while i < len(lines):
                s = lines[i].strip()
                m = re.match(r"^\d+\.\s+(.*)$", s)
                if m:
                    items.append(Paragraph(md_inline(m.group(1)), S_NUM))
                    i += 1
                elif s == "":
                    break
                else:
                    break
            flow.append(ListFlowable(
                [ListItem(p, leftIndent=18) for p in items],
                bulletType="1", bulletFontName="Helvetica-Bold",
                bulletFontSize=9.5, leftIndent=18, bulletColor=NAVY,
            ))
            flow.append(Spacer(1, 6))
            continue

        # Checkbox list items
        if stripped.startswith("- [ ]") or stripped.startswith("- [x]") or stripped.startswith("- [X]"):
            items = []
            while i < len(lines):
                s = lines[i].strip()
                if s.startswith("- [ ]"):
                    items.append(("☐ " + s[5:].strip(), False))
                    i += 1
                elif s.startswith("- [x]") or s.startswith("- [X]"):
                    items.append(("☑ " + s[5:].strip(), True))
                    i += 1
                elif s == "":
                    break
                else:
                    break
            for item_text, checked in items:
                color = GOOD if checked else SLATE
                style = ParagraphStyle("Checkbox", parent=S_BODY, textColor=color)
                flow.append(Paragraph(md_inline(item_text), style))
            flow.append(Spacer(1, 6))
            continue

        # italics-only meta line (e.g. *Last updated: ...*)
        if stripped.startswith("*") and stripped.endswith("*") and "**" not in stripped:
            flow.append(Paragraph(md_inline(stripped), S_SMALL))
            i += 1
            continue

        # paragraph — consume wrapped lines until blank
        buf = [stripped]
        i += 1
        while i < len(lines) and lines[i].strip() and not _is_block_start(lines[i]):
            buf.append(lines[i].strip())
            i += 1
        flow.append(Paragraph(md_inline(" ".join(buf)), S_BODY))

    flush_code()
    return flow


def _is_block_start(line):
    s = line.strip()
    if not s:
        return True
    if s.startswith("#"):
        return True
    if s.startswith("- ") or s.startswith("* "):
        return True
    if re.match(r"^\d+\.\s", s):
        return True
    if s.startswith("|"):
        return True
    if s.startswith("> "):
        return True
    if re.match(r"^-{3,}$", s):
        return True
    if s.startswith("```"):
        return True
    return False


# ---------- cover content helpers ------------------------------------------

def _cover_flowables(title, subtitle, eyebrow):
    """Text flowables for the cover — positioned over the painted background."""
    f = []
    # push content down so the eyebrow sits just below the gold bar (~0.60 h)
    f.append(Spacer(1, PAGE_H * 0.41))
    left_pad = 20 * mm
    f.append(_padded(Paragraph(eyebrow.upper(), S_COVER_EYEBROW), left_pad))
    f.append(Spacer(1, 8))
    f.append(_padded(Paragraph(title, S_COVER_TITLE), left_pad))
    f.append(Spacer(1, 12))
    f.append(_padded(Paragraph(subtitle, S_COVER_SUB), left_pad))
    f.append(Spacer(1, 24))
    meta = (
        "Prepared by MyLeadX Technologies Pvt. Ltd.<br/>"
        "Web: www.myleadx.ai &nbsp;&middot;&nbsp; Email: sales@myleadx.ai"
    )
    f.append(_padded(Paragraph(meta, S_COVER_META), left_pad))
    return f


def _padded(flowable, left_pad):
    """Wrap a single flowable in a 1-column table so we can add left padding
    without breaking word-wrap of the underlying paragraph."""
    t = Table([[flowable]], colWidths=[PAGE_W - left_pad - 20 * mm])
    t.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    # Shift the whole table right
    outer = Table([[t]], colWidths=[PAGE_W])
    outer.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), left_pad),
        ("RIGHTPADDING", (0, 0), (-1, -1), 20 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return outer


# ---------- per-document driver --------------------------------------------

DOCS = [
    {
        "md": "01-product-brochure.md",
        "pdf": "01-product-brochure.pdf",
        "title": "Product Brochure",
        "eyebrow": "Sales Collateral",
        "subtitle": "AI-Powered Lead Management Platform for Indian Businesses",
        "header_title": "Product Brochure",
        "drop_first_two_headings": True,
    },
    {
        "md": "02-feature-guide.md",
        "pdf": "02-feature-guide.pdf",
        "title": "Feature Guide",
        "eyebrow": "Technical Reference",
        "subtitle": "Complete feature documentation for evaluators and technical buyers",
        "header_title": "Feature Guide",
        "drop_first_two_headings": True,
    },
    {
        "md": "03-pricing.md",
        "pdf": "03-pricing.pdf",
        "title": "Pricing Guide",
        "eyebrow": "Commercial",
        "subtitle": "Simple, transparent pricing for every business size",
        "header_title": "Pricing",
        "drop_first_two_headings": True,
    },
    {
        "md": "04-one-pager.md",
        "pdf": "04-one-pager.pdf",
        "title": "Quick Reference",
        "eyebrow": "One-Pager",
        "subtitle": "AI-powered lead management — the essentials at a glance",
        "header_title": "Quick Reference",
        "drop_first_two_headings": True,
    },
    {
        "md": "05-competitive-comparison.md",
        "pdf": "05-competitive-comparison.pdf",
        "title": "Competitive Comparison",
        "eyebrow": "Internal · Sales Enablement",
        "subtitle": "Positioning and competitive analysis for the sales team",
        "header_title": "Competitive Comparison",
        "drop_first_two_headings": True,
    },
    {
        "md": "06-sales-faq.md",
        "pdf": "06-sales-faq.pdf",
        "title": "Sales FAQ",
        "eyebrow": "Internal · Sales Enablement",
        "subtitle": "Frequently asked questions, objections, and demo tips",
        "header_title": "Sales FAQ",
        "drop_first_two_headings": True,
    },
    {
        "md": "07-purchase-order-template.md",
        "pdf": "07-purchase-order-template.pdf",
        "title": "Purchase Order Template",
        "eyebrow": "Commercial · Template",
        "subtitle": "Official purchase order form — MyLeadX Technologies Pvt. Ltd.",
        "header_title": "Purchase Order",
        "drop_first_two_headings": True,
    },
    {
        "md": "08-service-agreement.md",
        "pdf": "08-service-agreement.pdf",
        "title": "Subscription Service Agreement",
        "eyebrow": "Legal · Template",
        "subtitle": "Master terms for the MyLeadX.ai subscription services",
        "header_title": "Service Agreement",
        "drop_first_two_headings": True,
    },
    {
        "md": "09-mutual-nda.md",
        "pdf": "09-mutual-nda.pdf",
        "title": "Mutual Non-Disclosure Agreement",
        "eyebrow": "Legal · Template",
        "subtitle": "Mutual confidentiality terms for evaluation and partnership discussions",
        "header_title": "Mutual NDA",
        "drop_first_two_headings": True,
    },
    {
        "md": "10-pricing-strategy-2025.md",
        "pdf": "10-pricing-strategy-2025.pdf",
        "title": "MyLeadX Pricing Strategy 2025",
        "eyebrow": "Internal · Confidential",
        "subtitle": "Comprehensive Pricing, Costs & Revenue Analysis",
        "header_title": "Pricing Strategy",
        "drop_first_two_headings": True,
    },
    {
        "md": "11-executive-summary.md",
        "pdf": "11-executive-summary.pdf",
        "title": "Pricing Strategy Executive Summary",
        "eyebrow": "Leadership · 2 Pages",
        "subtitle": "Key metrics, projections, and decisions at a glance",
        "header_title": "Executive Summary",
        "drop_first_two_headings": True,
    },
    {
        "md": "12-pricing-card.md",
        "pdf": "12-pricing-card.pdf",
        "title": "Sales Pricing Quick Reference",
        "eyebrow": "Sales Team · 1 Page",
        "subtitle": "Plans, discounts, commissions, and objection handlers",
        "header_title": "Pricing Card",
        "drop_first_two_headings": True,
    },
    {
        "md": "13-competitor-battle-cards.md",
        "pdf": "13-competitor-battle-cards.pdf",
        "title": "Competitor Battle Cards",
        "eyebrow": "Sales Team · Combat Guide",
        "subtitle": "Win against WATI, Interakt, Zoho, Freshsales, LeadSquared, HubSpot",
        "header_title": "Battle Cards",
        "drop_first_two_headings": True,
    },
    {
        "md": "14-roi-calculator.md",
        "pdf": "14-roi-calculator.pdf",
        "title": "ROI Calculator",
        "eyebrow": "Customer-Facing · Value Tool",
        "subtitle": "Calculate your savings and return on investment with MyLeadX",
        "header_title": "ROI Calculator",
        "drop_first_two_headings": True,
    },
]


def strip_leading_titles(md_text, count=2):
    """Drop the first `count` heading lines (and any following ---) so the cover
    page owns the title — the body shouldn't repeat it."""
    lines = md_text.splitlines()
    out = []
    dropped = 0
    for line in lines:
        s = line.strip()
        if dropped < count and s.startswith("#"):
            dropped += 1
            continue
        out.append(line)
    # collapse repeated blank/--- lines at the top
    while out and (not out[0].strip() or re.match(r"^-{3,}$", out[0].strip())):
        out.pop(0)
    return "\n".join(out)


def build_pdf(spec):
    md_path = os.path.join(HERE, spec["md"])
    pdf_path = os.path.join(HERE, spec["pdf"])
    with open(md_path, encoding="utf-8") as f:
        md = f.read()

    if spec.get("drop_first_two_headings"):
        body_md = strip_leading_titles(md, count=2)
    else:
        body_md = md

    avail_width = PAGE_W - MARGIN_L - MARGIN_R

    doc = SalesDocTemplate(pdf_path, spec["header_title"])

    story = []
    story.extend(_cover_flowables(spec["title"], spec["subtitle"], spec["eyebrow"]))
    story.append(NextPageTemplate("body"))
    story.append(PageBreak())
    story.extend(md_to_flowables(body_md, avail_width))

    doc.build(story)
    size_kb = os.path.getsize(pdf_path) / 1024
    print(f"  {spec['pdf']:<40} {size_kb:6.1f} KB")


def main():
    print("Generating professional PDFs with enhanced visuals:")
    print("=" * 55)
    for spec in DOCS:
        build_pdf(spec)
    print("=" * 55)
    print("Done! All PDFs generated with improved styling.")


if __name__ == "__main__":
    main()
