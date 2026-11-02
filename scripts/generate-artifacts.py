"""Genera el diagrama ER SVG y la solución escrita en PDF a partir del Markdown.
Requiere Python y reportlab. No modifica imágenes ni fabrica evidencias.
"""
from pathlib import Path
from html import escape
import re
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether

root = Path(__file__).resolve().parent.parent
docs = root / 'docs'
nodes = [
 ('users',30,55,['id PK','email UNIQUE','name, role, active','passwordHash, consentAt']),
 ('sessions',350,55,['id PK','userId FK','tokenHash','expiresAt']),
 ('deposits',30,290,['id PK','name UNIQUE','tempMin / tempMax','humidityMin / humidityMax']),
 ('records',350,290,['id PK, code UNIQUE','depositId FK','title, shelf, box','condition, nextInspectionAt']),
 ('inspections',680,290,['id PK','recordId FK, inspectorId FK','condition, notes','pests, wear, moisture']),
 ('readings',30,545,['id PK, depositId FK','sensorId, measuredAt','temperature','humidity']),
 ('alerts',350,545,['id PK, depositId FK','recordId FK nullable','kind, priority, key','status, resolvedAt']),
 ('tasks',680,545,['id PK, alertId FK','assigneeId FK','title, dueAt, status','resolution, completedAt']),
]
svg=['<svg xmlns="http://www.w3.org/2000/svg" width="970" height="790" viewBox="0 0 970 790">', '<rect width="970" height="790" fill="#f5f6f2"/>','<style>text{font-family:Arial,sans-serif;font-size:14px;fill:#254536}.name{font-size:18px;font-weight:bold;fill:white}.edge{fill:none;stroke:#7b9078;stroke-width:2}.label{font-size:12px}</style>','<text x="30" y="30" style="font-size:22px;font-weight:bold">CONSERVA · Modelo entidad-relación P3</text>']
edges=[('M 270 130 L 350 130','1 : N',290,120),('M 150 205 L 150 240 L 800 240 L 800 290','users 1 : N inspections',405,232),('M 270 365 L 350 365','1 : N',289,352),('M 590 365 L 680 365','1 : N',620,353),('M 150 440 L 150 545','1 : N',158,505),('M 210 440 L 210 505 L 400 505 L 400 545','deposit 1 : N alerts',240,494),('M 480 440 L 480 545','1 : N',489,505),('M 590 620 L 680 620','1 : N',620,607),('M 270 85 L 950 85 L 950 750 L 800 750 L 800 695','users 1 : N tasks',737,740)]
for path,label,x,y in edges: svg.extend([f'<path class="edge" d="{path}"/>',f'<text class="label" x="{x}" y="{y}">{escape(label)}</text>'])
for name,x,y,fields in nodes:
 svg.extend([f'<rect x="{x}" y="{y}" width="240" height="150" rx="8" fill="white" stroke="#d4dfd1"/>',f'<path d="M{x+8} {y} H{x+232} Q{x+240} {y} {x+240} {y+8} V{y+38} H{x} V{y+8} Q{x} {y} {x+8} {y}" fill="#244f40"/>',f'<text class="name" x="{x+14}" y="{y+25}">{name}</text>'])
 for i,f in enumerate(fields):svg.append(f'<text x="{x+14}" y="{y+60+i*23}">{escape(f)}</text>')
svg.append('</svg>');(docs/'modelo-er.svg').write_text('\n'.join(svg),encoding='utf-8')

styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='BodyCustom',fontName='Helvetica',fontSize=9.4,leading=14,textColor=colors.HexColor('#2d4037'),spaceAfter=8))
styles.add(ParagraphStyle(name='TableCustom',parent=styles['BodyCustom'],fontSize=8,leading=11,spaceAfter=0))
for name in ['Title','Heading1','Heading2','Heading3']:styles[name].textColor=colors.HexColor('#244f40')
styles['Heading1'].fontSize=17;styles['Heading1'].spaceBefore=18
styles['Heading2'].fontSize=12;styles['Heading2'].spaceBefore=13
def markup(s):
 s=escape(s)
 s=re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',s)
 s=re.sub(r'`(.+?)`',r'<font name="Courier">\1</font>',s)
 return s
story=[];lines=(docs/'SOLUCION-P3.md').read_text(encoding='utf-8').splitlines();i=0
while i<len(lines):
 line=lines[i].strip();i+=1
 if not line:continue
 if line.startswith('|'):
  rows=[line]
  while i<len(lines) and lines[i].strip().startswith('|'):rows.append(lines[i].strip());i+=1
  parsed=[]
  for row in rows:
   cells=[x.strip() for x in row.strip('|').split('|')]
   if all(re.fullmatch(r'[:\- ]+',x) for x in cells):continue
   parsed.append([Paragraph(markup(c),styles['TableCustom']) for c in cells])
  n=len(parsed[0]);widths=[487/n]*n
  if n==2:widths=[145,342]
  table=Table(parsed,colWidths=widths,repeatRows=1,hAlign='LEFT')
  table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#e5ecdf')),('VALIGN',(0,0),(-1,-1),'TOP'),('GRID',(0,0),(-1,-1),.4,colors.HexColor('#cdd8c9')),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]))
  story.extend([table,Spacer(1,12)]);continue
 if line.startswith('# '):story.extend([Paragraph(markup(line[2:]),styles['Title']),Spacer(1,15)]);continue
 if line.startswith('## '):story.append(Paragraph(markup(line[3:]),styles['Heading1']));continue
 if line.startswith('### '):story.append(Paragraph(markup(line[4:]),styles['Heading2']));continue
 if line.startswith('- '):line='• '+line[2:]
 story.append(Paragraph(markup(line),styles['BodyCustom']))
def page(canvas,doc):
 canvas.saveState();canvas.setStrokeColor(colors.HexColor('#cdd8c9'));canvas.line(54,43,A4[0]-54,43);canvas.setFont('Helvetica',8);canvas.setFillColor(colors.HexColor('#64765d'));canvas.drawString(54,29,'CONSERVA · CLENA · Solución del taller P3');canvas.drawRightString(A4[0]-54,29,str(doc.page));canvas.restoreState()
SimpleDocTemplate(str(docs/'SOLUCION-P3.pdf'),pagesize=A4,rightMargin=54,leftMargin=54,topMargin=48,bottomMargin=60,title='Conserva — Solución del taller P3',author='Proyecto P3').build(story,onFirstPage=page,onLaterPages=page)
print('Generados docs/modelo-er.svg y docs/SOLUCION-P3.pdf')
