"""Generate the PC2 report from real E2E screenshots. Requires reportlab and Pillow.

Run from the repository: python scripts/generate-report.py
Original screenshots remain unchanged; crops used for legibility are captioned.
"""
from pathlib import Path
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parents[1]
SHOTS = ROOT / "docs/pc2/capturas"
OUTPUT = ROOT / "docs/pc2/informe.pdf"
WIDTH, HEIGHT = landscape(A4)
INK, MUTED, PRIMARY = map(HexColor, ["#161619", "#626275", "#4459ff"])
FONT, BOLD = "Helvetica", "Helvetica-Bold"
arial = Path("C:/Windows/Fonts/arial.ttf")
if arial.exists():
    pdfmetrics.registerFont(TTFont("ReportSans", str(arial)))
    pdfmetrics.registerFont(TTFont("ReportSansBold", "C:/Windows/Fonts/arialbd.ttf"))
    FONT, BOLD = "ReportSans", "ReportSansBold"
c = canvas.Canvas(str(OUTPUT), pagesize=(WIDTH, HEIGHT))
c.setTitle("ServiceHub · Informe PC2")
c.setAuthor("Equipo ServiceHub · Ingeniería de Sistemas")
c.setSubject("Angular 20, JSON Server, REST y evidencias de funcionamiento")


def para(text, x, top, width, size=10, color=INK, bold=False, leading=None):
    style = ParagraphStyle("body", fontName=BOLD if bold else FONT, fontSize=size,
                           leading=leading or size*1.45, textColor=color)
    p = Paragraph(text, style)
    _, height = p.wrap(width, HEIGHT)
    p.drawOn(c, x, HEIGHT-top-height)
    return top+height


def begin(number, title, subtitle):
    c.setFillColor(PRIMARY)
    c.rect(0, HEIGHT-7, WIDTH, 7, fill=1, stroke=0)
    para("SERVICEHUB / PC2", 36, 23, 400, 9, PRIMARY, True)
    para(title, 36, 49, 760, 25, bold=True, leading=29)
    para(subtitle, 36, 88, 760, 10, MUTED)
    c.setStrokeColor(HexColor("#e2e2e8"))
    c.line(36, 36, WIDTH-36, 36)
    para("JavaScript Avanzado · 12 octubre 2026 · Datos ficticios", 36, HEIGHT-28, 620, 8, MUTED)
    para(f"{number:02d} / 06", WIDTH-87, HEIGHT-28, 60, 8, MUTED)


def shot(filename, x, top, max_width, max_height, crop=None, caption=""):
    with Image.open(SHOTS / filename) as original:
        pic = original.convert("RGB")
        if crop:
            pic = pic.crop(crop)
        scale = min(max_width/pic.width, max_height/pic.height)
        w, h = pic.width*scale, pic.height*scale
        c.setStrokeColor(HexColor("#e2e2e8"))
        c.rect(x-0.5, HEIGHT-top-h-0.5, w+1, h+1, fill=0, stroke=1)
        c.drawImage(ImageReader(pic), x, HEIGHT-top-h, w, h)
    para(caption or filename, x, top+h+7, max_width, 8, MUTED)
    return top+h+24


def bullet(text, x, top, width):
    c.setFillColor(PRIMARY)
    c.circle(x+3, HEIGHT-top-7, 2, fill=1, stroke=0)
    return para(text, x+15, top, width-15)+10


begin(1, "Conectemos personas e ideas.", "Primera implementación integrada de un marketplace de servicios en Perú")
shot("01-home-desktop.png", 36, 126, 537, 372, crop=(0,0,1440,995),
     caption="Home real en Edge, 1440 px. Recorte superior: hero y seis categorías.")
y = para("El producto", 595, 132, 210, 16, bold=True)
y = para("Servicios digitales y presenciales, perfiles profesionales, conversación, oferta, contratación y seguimiento.", 595, y+13, 210)
y = para("Una cuenta puede contratar y ofrecer. Todos los ejemplos son ficticios; los pagos son simulados.", 595, y+12, 210)
y = para("Base evaluable", 595, y+22, 210, 16, bold=True)
for text in ["Angular 20.3.33 / TypeScript 5.9.3", "Bootstrap 5.3.8 personalizado", "JSON Server 0.17.4 + db.json", "Figma, Inter local y assets originales"]:
    y = bullet(text,595,y+9,210)
c.showPage()

begin(2, "Estructura y servicios REST", "La vista navega con Angular Router; los recursos persisten con el router de JSON Server")
y = para("Organización del proyecto",36,130,350,16,bold=True)
for label, desc in [
    ("core/", "HttpClient + Observable, sesión y guards."),
    ("layouts/ y shared/", "Shell, tema, ServiceCard, diálogo, pipe y directiva."),
    ("features/", "Catálogo, perfiles, publicación, mensajes, listas y pedidos."),
    ("shared/models.ts", "Contratos TypeScript de las entidades."),
    ("server/", "Validación, permisos, archivos y operaciones compuestas."),
    ("db.json y uploads/", "Datos e imágenes persistentes. No se resetean al iniciar.")]:
    y = para(label,36,y+14,350,11,PRIMARY,True)
    y = para(desc,36,y+3,350)

y = para("Navegador → /api → JSON Server",434,130,366,16,bold=True)
y = para("El proxy de Angular conecta 4200 con 3000. Las colecciones usan el router original; el frontend no importa db.json ni simula cambios con localStorage.",434,y+14,366)
for text in ["GET: catálogo, perfiles, mensajes y tablas.", "POST: servicios, mensajes y listas.", "PATCH: editar/pausar servicio y responder reseña.", "DELETE: borradores elegibles y listas propias."]:
    y = bullet(text,434,y+12,366)
y = para("Paginación comprobada",434,y+15,366,13,bold=True)
y = para("GET /api/services?_page=2&amp;_limit=8<br/>Array de 8 registros. X-Total-Count: 18 y header Link.",434,y+8,366,10)
y = para("Acciones de checkout: sesión, importe calculado por servidor, snapshot, una escritura lógica y reintento idempotente. No se atribuyen transacciones ACID a JSON Server.",434,y+17,366,10,MUTED)
c.showPage()

begin(3, "Formularios, CRUD y validación", "Reactive Forms, alertas con NgIf y tablas Bootstrap conectadas a persistencia real")
shot("07-formulario-validacion.png",36,130,370,328,crop=(195,157,1247,1047),
     caption="Recorte de formulario inválido: mensaje y campos señalados; barra inferior fija.")
shot("09-mis-servicios-crud.png",436,130,370,328,crop=(70,142,1370,690),
     caption="Recorte de la tabla tras crear, publicar, pausar y recargar un servicio.")
y = para("Verificado en API y navegador",436,326,370,14,bold=True)
for text in ["GET/POST/PATCH/DELETE con propiedad validada.","Un cliente incompleto no puede publicar.","Cambios persisten tras recargar y reabrir la base.","Clases btn, form-control y table-striped/table-hover."]:
    y = bullet(text,436,y+9,370)
para("Capturas completas: 07-formulario-validacion.png, 08-formulario-paquetes.png y 09-mis-servicios-crud.png.",36,516,770,9,MUTED)
c.showPage()

begin(4, "Del paquete al pedido", "Pipe precioSoles visible, extras, pago simulado y snapshot del acuerdo")
shot("10-checkout.png",36,127,534,376,
     caption="Checkout real de la prueba: cantidad 2, extra y total mostrado en soles.")
y = para("S/ 245.00",595,133,210,28,PRIMARY,True)
y = para("11000 × 2 + 2500<br/>= 24500 céntimos",595,y+9,210,12)
y = para("El pipe recibe céntimos y divide una sola vez. El servidor recalcula antes de confirmar.",595,y+16,210)
for text in ["Pago fallido: no crea pedido.","Reintento: retorna el acuerdo existente.","Oferta: máximo un pedido.","Inicio → entrega → ajuste o confirmación.","Reseña tras completar o cancelar después del inicio."]:
    y = bullet(text,595,y+9,210)
c.showPage()

begin(5, "Conversaciones y responsive", "Dos perfiles de navegador coordinan una oferta y completan una contratación")
shot("13-chat-oferta.png",36,129,555,386,
     caption="Edge 1440 px: mensaje, oferta real de S/ 140.00 y resumen lateral.")
shot("15-chat-390.png",625,129,176,386,
     caption="390 px: chat y acciones legibles; resumen en drawer con Escape.")
c.showPage()

begin(6, "Resultados y límites de la entrega", "Evidencia reproducible; la primera versión académica conserva pendientes explícitos")
y = para("Verificación ejecutada",36,130,355,16,bold=True)
for text in ["Instalación limpia desde lockfile: correcta.","Build correcto: 600.83 kB inicial / 117.88 kB estimados de transferencia.","5 de 5 unitarios (Vitest 4.1.11).","14 de 14 pruebas de API; bases temporales.","6 de 6 recorridos E2E en Edge.","18 capturas reales: desktop, 390 y 768 px.","Reinicio preserva pedidos, mensajes e imágenes; sesión nueva al volver a ingresar."]:
    y = bullet(text,36,y+10,355)
para("Instalación final: 0 vulnerabilidades conocidas reportadas. Se corrigieron versiones y overrides y se repitieron las verificaciones.",36,y+8,355,9,MUTED)

y = para("Pendientes identificados",434,130,366,16,bold=True)
for text in ["Reducir CSS inicial: warning de 100.83 kB sobre presupuesto de 500 kB.","Filtros por día local Lima; actualmente comparan fecha UTC.","Revisión de accesibilidad/360 px y refinamiento de formularios.","Portadas reales, trayectoria estructurada y reputación agregada en perfil.","Retención y decodificación completa de imágenes; separar efectos secundarios de CRUD."]:
    y = bullet(text,434,y+10,366)
y = para("Demostración",434,y+17,366,13,bold=True)
y = para("npm ci · npm start · http://127.0.0.1:4200<br/>cliente@servicehub.test / profesional@servicehub.test<br/>Contraseña: ServiceHub123!",434,y+8,366,10)
para("Consultar README, matriz-cumplimiento.md y docs/estado-actual.md. No hay pagos reales, despliegue público ni transacciones ACID. Sin commit/push del agente.",434,y+14,366,9,MUTED)
c.showPage()
c.save()
print(f"PDF generado: {OUTPUT} ({OUTPUT.stat().st_size} bytes, 6 páginas)")
