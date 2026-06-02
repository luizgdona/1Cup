"""
Gera 4 mockups de tela do app 1Cup e monta um painel final 1600x900.
Paleta Material 3: primary #26170C, secondary #7D562D, gold #FFC000
Light bg: #FDF8F5 | Dark bg: #141210 | Dark surface: #1C1A18
"""

from PIL import Image, ImageDraw, ImageFont
import os, math

OUT_DIR = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(OUT_DIR, exist_ok=True)

# ── Constantes ────────────────────────────────────────────────
W, H = 390, 844          # iPhone 14 lógico
RADIUS = 40              # cantos do frame
INNER_R = 32
STATUS_H = 44
NAV_H = 82

# Cores
C = {
    "primary":      "#26170C",
    "primary_c":    "#3D2B1F",
    "secondary":    "#7D562D",
    "gold":         "#FFC000",
    "gold_dim":     "#FFD54F",
    "bg_l":         "#FDF8F5",
    "bg_d":         "#141210",
    "surf_l":       "#FFFFFF",
    "surf_d":       "#1C1A18",
    "surf_var_l":   "#E6E2DF",
    "surf_var_d":   "#2E2A27",
    "on_surf_l":    "#1C1B1A",
    "on_surf_d":    "#E8E0DA",
    "on_sv_l":      "#4F453F",
    "on_sv_d":      "#D2C4BC",
    "error":        "#BA1A1A",
    "latte":        "#E9EDC9",
    "paper":        "#F8F3F0",
}

def hex2rgb(h): r=int(h[1:3],16);g=int(h[3:5],16);b=int(h[5:7],16);return(r,g,b)
def rgb(k): return hex2rgb(C[k])

def load_font(size, bold=False):
    """Tenta carregar fonte do sistema, cai para default."""
    candidates = [
        "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    bold_c = [
        "C:/Windows/Fonts/segoeuib.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    pool = bold_c if bold else candidates
    for p in pool:
        if os.path.exists(p):
            try: return ImageFont.truetype(p, size)
            except: pass
    return ImageFont.load_default()

def draw_rrect(draw, xy, radius, fill):
    x0,y0,x1,y1 = xy
    draw.rectangle([x0+radius,y0,x1-radius,y1], fill=fill)
    draw.rectangle([x0,y0+radius,x1,y1-radius], fill=fill)
    for cx,cy in [(x0+radius,y0+radius),(x1-radius,y0+radius),(x0+radius,y1-radius),(x1-radius,y1-radius)]:
        draw.ellipse([cx-radius,cy-radius,cx+radius,cy+radius], fill=fill)

def phone_frame(img, dark=False):
    """Adiciona frame de smartphone em volta da tela."""
    BORDER = 16
    fw, fh = img.width + BORDER*2, img.height + BORDER*2 + 30
    frame = Image.new("RGBA", (fw, fh), (0,0,0,0))
    d = ImageDraw.Draw(frame)
    # Shell escuro
    shell = "#1A1A1A" if not dark else "#0D0D0D"
    draw_rrect(d, [0,0,fw-1,fh-1], RADIUS+4, shell)
    # Tela
    frame.paste(img, (BORDER, 15+BORDER))
    # Notch/pill
    pill_w, pill_h = 80, 10
    px = (fw - pill_w)//2
    d.rounded_rectangle([px, 22, px+pill_w, 22+pill_h], radius=5, fill="#111111")
    return frame

def status_bar(draw, y, dark=False):
    fg = rgb("on_surf_d") if dark else rgb("on_surf_l")
    f = load_font(11)
    draw.text((16, y+14), "9:41", fill=fg, font=f)
    draw.text((W-60, y+14), "● ● ●", fill=fg, font=f)

def app_bar(draw, y, title, bg, fg, subtitle=None):
    draw.rectangle([0,y,W,y+56], fill=bg)
    f = load_font(17, bold=True)
    draw.text((16, y+16), title, fill=fg, font=f)
    if subtitle:
        fs = load_font(12)
        draw.text((16, y+36), subtitle, fill=fg+(128,) if isinstance(fg,tuple) else fg, font=fs)

def nav_bar(draw, y, dark=False):
    bg = rgb("surf_d") if dark else rgb("surf_l")
    fg_sel = rgb("primary") if not dark else hex2rgb("#DEC1AF")
    fg_un = rgb("on_sv_d") if dark else rgb("on_sv_l")
    draw.rectangle([0,y,W,y+NAV_H], fill=bg)
    tabs = [("🏠","Feed"), ("🔍","Descobrir"), ("👤","Perfil")]
    col_w = W // 3
    f = load_font(10)
    for i,(icon,label) in enumerate(tabs):
        cx = col_w*i + col_w//2
        fi = load_font(22)
        draw.text((cx-10, y+10), icon, fill=fg_sel if i==0 else fg_un, font=fi)
        draw.text((cx - len(label)*3, y+40), label, fill=fg_sel if i==0 else fg_un, font=f)

def star_row(draw, x, y, stars, size=16, gold=True):
    """Desenha estrelas. stars = 0..5, suporte a 0.5."""
    color = hex2rgb(C["gold"])
    dim   = hex2rgb(C["surf_var_l"])
    for i in range(5):
        sx = x + i*(size+3)
        fill = color if stars >= i+1 else (hex2rgb(C["gold_dim"]) if stars >= i+0.5 else dim)
        draw.ellipse([sx, y, sx+size, y+size], fill=fill)

def chip(draw, x, y, label, bg, fg, font):
    tw = font.getlength(label) if hasattr(font,'getlength') else len(label)*7
    pw = int(tw)+16
    draw.rounded_rectangle([x,y,x+pw,y+20], radius=10, fill=bg)
    draw.text((x+8, y+3), label, fill=fg, font=font)
    return x+pw+8

def avatar(draw, cx, cy, r, letter, bg, fg):
    draw.ellipse([cx-r,cy-r,cx+r,cy+r], fill=bg)
    f = load_font(int(r*0.9), bold=True)
    draw.text((cx-r//2, cy-r//2), letter, fill=fg, font=f)

# ══════════════════════════════════════════════════════════════
# TELA 1 — Feed (light)
# ══════════════════════════════════════════════════════════════
def make_feed():
    img = Image.new("RGB", (W,H), rgb("bg_l"))
    d = ImageDraw.Draw(img)

    status_bar(d, 0)
    # AppBar
    bar_h = STATUS_H+56
    d.rectangle([0,STATUS_H,W,bar_h], fill=rgb("surf_l"))
    fb = load_font(20, bold=True)
    d.text((16,STATUS_H+16), "☕ 1Cup", fill=rgb("primary"), font=fb)
    d.text((W-40,STATUS_H+16), "🔔", fill=rgb("on_sv_l"), font=load_font(18))

    y = bar_h + 12

    # ── Card 1 ───────────────────────────────────────────────
    card_h = 310
    draw_rrect(d, [12,y,W-12,y+card_h], 16, rgb("surf_l"))

    # Avatar + nome
    avatar(d, 40, y+32, 20, "L", rgb("primary_c"), rgb("surf_l"))
    fn = load_font(13, bold=True)
    fs = load_font(11)
    d.text((68, y+18), "Lucas Andrade", fill=rgb("on_surf_l"), font=fn)
    d.text((68, y+34), "12 min", fill=rgb("on_sv_l"), font=fs)

    # Foto do café (retângulo âmbar)
    py = y+60
    photo_colors = [(180,100,30),(200,120,40),(160,85,20),(190,110,35)]
    for i,(row_c) in enumerate([(180,100,30),(195,115,35),(170,95,25),(185,108,32)]):
        d.rectangle([12,py+i*38,W-12,py+(i+1)*38-2], fill=row_c)
    # Gradiente simulado
    d.rectangle([12,py,W-12,py+150], fill=(185,108,40))
    d.rounded_rectangle([12,py,W-12,py+150], radius=12, fill=(185,108,40))
    # Texto sobre foto
    fp = load_font(15, bold=True)
    d.text((24,py+10), "Fazenda Santa Inês", fill=(255,255,255), font=fp)
    d.text((24,py+30), "Bourbon Natural", fill=(255,230,180), font=fs)

    # Avaliação
    ry = py+162
    d.text((16, ry), "Mínimo Café", fill=rgb("secondary"), font=load_font(13,bold=True))
    star_row(d, 16, ry+20, 4.5, size=14)
    d.text((102, ry+20), "4.5", fill=rgb("on_surf_l"), font=load_font(12,bold=True))

    # Descrição
    d.text((16, ry+42), '"Muito frutado, lembra ameixa e tâmara."', fill=rgb("on_sv_l"), font=load_font(11))

    # Local
    d.text((16, ry+62), "📍 Coffee Lab, SP  ·  V60", fill=rgb("on_sv_l"), font=load_font(11))

    y2 = y+card_h+10

    # ── Card 2 (menor) ────────────────────────────────────────
    draw_rrect(d, [12,y2,W-12,y2+80], 16, rgb("surf_l"))
    avatar(d, 40, y2+40, 18, "A", hex2rgb("#7D562D"), rgb("surf_l"))
    d.text((66, y2+20), "Ana Paula", fill=rgb("on_surf_l"), font=fn)
    d.text((66, y2+36), "Gesha Village · Washed", fill=rgb("secondary"), font=load_font(12))
    star_row(d, 66, y2+54, 5.0, size=12)
    d.text((136, y2+54), "5.0", fill=rgb("on_surf_l"), font=load_font(11,bold=True))

    nav_bar(d, H-NAV_H)
    # FAB
    fx, fy, fr = W-56, H-NAV_H-56, 24
    d.ellipse([fx-fr,fy-fr,fx+fr,fy+fr], fill=rgb("primary"))
    d.text((fx-7, fy-10), "+", fill="white", font=load_font(22,bold=True))

    return phone_frame(img, dark=False)

# ══════════════════════════════════════════════════════════════
# TELA 2 — Check-in (light)
# ══════════════════════════════════════════════════════════════
def make_checkin():
    img = Image.new("RGB", (W,H), rgb("bg_l"))
    d = ImageDraw.Draw(img)
    status_bar(d, 0)
    d.rectangle([0,STATUS_H,W,STATUS_H+56], fill=rgb("surf_l"))
    d.text((50,STATUS_H+16), "Novo Check-in", fill=rgb("on_surf_l"), font=load_font(17,bold=True))
    d.text((16,STATUS_H+16), "←", fill=rgb("primary"), font=load_font(18))

    y = STATUS_H+72

    # Campo busca café
    d.text((16,y), "Qual café você está bebendo? *", fill=rgb("on_sv_l"), font=load_font(12))
    y+=22
    draw_rrect(d,[16,y,W-16,y+48],12,rgb("surf_var_l"))
    d.text((36,y+14),"🔍  Buscar café...",fill=rgb("on_sv_l"),font=load_font(13))
    y+=64

    # Seção nota
    d.text((16,y),"Sua nota *",fill=rgb("on_sv_l"),font=load_font(12))
    y+=22
    # Estrelas grandes
    for i in range(4):
        sx = 16 + i*52
        d.ellipse([sx,y,sx+40,y+40],fill=rgb("gold"))
    # Meia estrela
    sx = 16+4*52
    d.ellipse([sx,y,sx+40,y+40],fill=rgb("surf_var_l"))
    d.ellipse([sx,y,sx+20,y+40],fill=rgb("gold"))
    d.text((16,y+48),"4.0 / 5.0",fill=rgb("on_sv_l"),font=load_font(11))
    y+=76

    # Textarea
    d.text((16,y),"Como foi?",fill=rgb("on_sv_l"),font=load_font(12))
    y+=20
    draw_rrect(d,[16,y,W-16,y+80],12,rgb("surf_var_l"))
    d.text((24,y+12),"Acidez brilhante, notas de fruta...",fill=rgb("on_sv_l"),font=load_font(12))
    y+=96

    # Método preparo
    d.text((16,y),"Método de preparo",fill=rgb("on_sv_l"),font=load_font(12))
    y+=20
    fc = load_font(11)
    bg_chip = rgb("primary"); fg_chip=(255,255,255)
    bg_un = rgb("surf_var_l"); fg_un = rgb("on_sv_l")
    cx=16
    for label, sel in [("Espresso",False),("V60",True),("Aeropress",False),("French Press",False)]:
        tw = int(fc.getlength(label)) if hasattr(fc,'getlength') else len(label)*7
        pw = tw+16
        bg = bg_chip if sel else bg_un
        fg = fg_chip if sel else fg_un
        draw_rrect(d,[cx,y,cx+pw,y+28],14,bg)
        d.text((cx+8,y+7),label,fill=fg,font=fc)
        cx+=pw+8
        if cx > W-80: cx=16; y+=36
    y+=44

    # Botão
    draw_rrect(d,[16,y,W-16,y+52],12,rgb("primary"))
    d.text((W//2-68,y+15),"Registrar Check-in",fill="white",font=load_font(15,bold=True))

    return phone_frame(img, dark=False)

# ══════════════════════════════════════════════════════════════
# TELA 3 — Detalhe do café (dark)
# ══════════════════════════════════════════════════════════════
def make_coffee_detail():
    img = Image.new("RGB", (W,H), rgb("bg_d"))
    d = ImageDraw.Draw(img)
    status_bar(d, 0, dark=True)

    # Hero
    hero_h = 220
    draw_rrect(d,[0,0,W,hero_h],0,(120,70,20))
    # Gradiente simulado
    for row in range(hero_h):
        alpha = int(180 * row/hero_h)
        d.line([(0,row),(W,row)], fill=(0,0,0,alpha if alpha<256 else 255))
    d.rectangle([0,0,W,hero_h], fill=(110,60,15))
    # Texto hero
    d.text((16,STATUS_H+60),"Fazenda Santa Inês",fill="white",font=load_font(20,bold=True))
    d.text((16,STATUS_H+88),"Bourbon Natural",fill=(220,190,150),font=load_font(13))
    # Back
    d.text((16,STATUS_H+14),"←",fill="white",font=load_font(18))
    d.text((W-40,STATUS_H+14),"✏",fill="white",font=load_font(16))

    y = hero_h+16

    # Torrefação
    draw_rrect(d,[16,y,W-16,y+56],12,rgb("surf_d"))
    avatar(d, 40, y+28, 18, "M", rgb("primary"), rgb("surf_l"))
    d.text((66,y+14),"Mínimo Café",fill=hex2rgb("#DEC1AF"),font=load_font(13,bold=True))
    d.text((66,y+32),"São Paulo, SP",fill=rgb("on_sv_d"),font=load_font(11))
    y+=72

    # Stats boxes
    stats = [("⭐ 4.3","Média"),("28","Check-ins"),("87.5","SCA")]
    bw = (W-44)//3
    for i,(val,lbl) in enumerate(stats):
        bx = 16 + i*(bw+6)
        draw_rrect(d,[bx,y,bx+bw,y+64],12,rgb("surf_var_d"))
        fv = load_font(18,bold=True); fl=load_font(10)
        d.text((bx+bw//2-len(val)*5,y+10),val,fill=hex2rgb("#DEC1AF"),font=fv)
        d.text((bx+bw//2-len(lbl)*3,y+38),lbl,fill=rgb("on_sv_d"),font=fl)
    y+=80

    # Notas sensoriais
    d.text((16,y),"Notas sensoriais",fill=hex2rgb("#DEC1AF"),font=load_font(13,bold=True))
    y+=24
    fc=load_font(11); cx=16
    for note in ["Ameixa","Chocolate","Tâmara","Mel"]:
        tw=int(fc.getlength(note)) if hasattr(fc,'getlength') else len(note)*7
        pw=tw+16
        draw_rrect(d,[cx,y,cx+pw,y+26],13,rgb("primary_c"))
        d.text((cx+8,y+6),note,fill=hex2rgb("#DEC1AF"),font=fc)
        cx+=pw+8
    y+=42

    # Métodos
    d.text((16,y),"Métodos indicados",fill=hex2rgb("#DEC1AF"),font=load_font(13,bold=True))
    y+=24; cx=16
    for m in ["Espresso","V60","Aeropress"]:
        tw=int(fc.getlength(m)) if hasattr(fc,'getlength') else len(m)*7
        pw=tw+16
        draw_rrect(d,[cx,y,cx+pw,y+26],13,rgb("surf_var_d"))
        d.text((cx+8,y+6),m,fill=rgb("on_sv_d"),font=fc)
        cx+=pw+8
    y+=50

    # CTA
    draw_rrect(d,[16,y,W-16,y+52],12,rgb("primary"))
    d.text((W//2-50,y+15),"Fazer Check-in",fill="white",font=load_font(15,bold=True))

    return phone_frame(img, dark=True)

# ══════════════════════════════════════════════════════════════
# TELA 4 — Perfil (dark)
# ══════════════════════════════════════════════════════════════
def make_profile():
    img = Image.new("RGB", (W,H), rgb("bg_d"))
    d = ImageDraw.Draw(img)
    status_bar(d, 0, dark=True)

    # AppBar
    d.rectangle([0,STATUS_H,W,STATUS_H+56], fill=rgb("surf_d"))
    d.text((16,STATUS_H+16),"@lucasandrade",fill=hex2rgb("#DEC1AF"),font=load_font(16,bold=True))
    d.text((W-80,STATUS_H+16),"👥 ⚙",fill=rgb("on_sv_d"),font=load_font(14))

    y = STATUS_H+72
    # Avatar grande
    avatar(d, W//2, y+48, 48, "L", rgb("primary"), hex2rgb("#DEC1AF"))
    y+=112

    d.text((W//2-50,y),"Lucas Andrade",fill=hex2rgb("#DEC1AF"),font=load_font(18,bold=True))
    y+=28
    d.text((W//2-80,y),"Barista apaixonado por naturals",fill=rgb("on_sv_d"),font=load_font(11))
    y+=28

    # Stats
    stats = [("142","Check-ins"),("38","Cafés"),("12","Badges")]
    col = W//3
    for i,(val,lbl) in enumerate(stats):
        cx = col*i+col//2
        d.text((cx-len(val)*6,y),val,fill=hex2rgb("#DEC1AF"),font=load_font(20,bold=True))
        d.text((cx-len(lbl)*3,y+28),lbl,fill=rgb("on_sv_d"),font=load_font(10))
    # Divisores
    for i in [1,2]:
        dx = col*i
        d.line([(dx,y),(dx,y+50)],fill=rgb("surf_var_d"),width=1)
    y+=68

    # Tabs
    d.rectangle([0,y,W,y+44],fill=rgb("surf_d"))
    d.text((W//4-30,y+12),"Brewing Journal",fill=hex2rgb("#DEC1AF"),font=load_font(12,bold=True))
    d.text((3*W//4-20,y+12),"Badges",fill=rgb("on_sv_d"),font=load_font(12))
    d.line([(0,y+42),(W//2,y+42)],fill=hex2rgb("#DEC1AF"),width=2)
    y+=52

    # Badges grid
    d.text((16,y),"Conquistados",fill=hex2rgb("#DEC1AF"),font=load_font(13,bold=True))
    y+=24
    badges_earned=[("☕","Primeira Xícara"),("⚡","Viciado em Cafeína"),("🌍","Viajante"),("🌅","Coruja Matinal")]
    badges_locked=[("🌑","Alma Escura"),("🌿","Raro e Delicado")]
    col2 = (W-36)//2

    for i,(icon,name) in enumerate(badges_earned):
        bx = 16 + (i%2)*(col2+4)
        if i>0 and i%2==0: y+=64
        draw_rrect(d,[bx,y,bx+col2,y+56],12,rgb("primary_c"))
        d.rectangle([bx,y,bx+col2,y+56],fill=rgb("primary_c"))
        # Borda dourada
        draw_rrect(d,[bx,y,bx+col2,y+56],12,rgb("primary_c"))
        d.rounded_rectangle([bx,y,bx+col2,y+56],radius=12,outline=rgb("gold"),width=2,fill=rgb("primary_c"))
        fi=load_font(18); fn2=load_font(10)
        d.text((bx+10,y+8),icon,fill=rgb("gold"),font=fi)
        d.text((bx+36,y+10),name,fill=hex2rgb("#DEC1AF"),font=fn2)
        d.text((bx+36,y+26),"✓ Conquistado",fill=rgb("gold"),font=load_font(9))
    y+=64+16

    d.text((16,y),"Bloqueados",fill=rgb("on_sv_d"),font=load_font(12))
    y+=20
    for i,(icon,name) in enumerate(badges_locked):
        bx=16+(i%2)*(col2+4)
        draw_rrect(d,[bx,y,bx+col2,y+48],12,rgb("surf_var_d"))
        d.rounded_rectangle([bx,y,bx+col2,y+48],radius=12,fill=rgb("surf_var_d"))
        fi=load_font(18); fn2=load_font(10)
        d.text((bx+10,y+8),icon,fill=rgb("on_sv_d"),font=fi)
        d.text((bx+36,y+12),name,fill=rgb("on_sv_d"),font=fn2)

    nav_bar(d, H-NAV_H, dark=True)
    return phone_frame(img, dark=True)

# ══════════════════════════════════════════════════════════════
# Monta painel final
# ══════════════════════════════════════════════════════════════
screens = [
    ("Feed",            make_feed()),
    ("Check-in",        make_checkin()),
    ("Detalhe do café", make_coffee_detail()),
    ("Perfil",          make_profile()),
]

PANEL_W, PANEL_H = 1680, 960
panel = Image.new("RGB", (PANEL_W, PANEL_H), hex2rgb(C["paper"]))
dp = ImageDraw.Draw(panel)

# Título do painel
fp = load_font(28, bold=True)
dp.text((PANEL_W//2 - 60, 16), "☕ 1Cup", fill=hex2rgb(C["primary"]), font=fp)

slot_w = PANEL_W // 4
for i, (label, scr) in enumerate(screens):
    # Redimensiona para caber no slot
    ratio = min((slot_w - 32) / scr.width, (PANEL_H - 100) / scr.height)
    new_w = int(scr.width * ratio)
    new_h = int(scr.height * ratio)
    scr_r = scr.resize((new_w, new_h), Image.LANCZOS)

    x = i * slot_w + (slot_w - new_w) // 2
    y = (PANEL_H - new_h) // 2 + 30

    if scr_r.mode == "RGBA":
        panel.paste(scr_r, (x, y), scr_r.split()[3])
    else:
        panel.paste(scr_r, (x, y))

    fl = load_font(13)
    dp.text((i*slot_w + slot_w//2 - len(label)*4, PANEL_H-28), label,
            fill=hex2rgb(C["on_sv_l"]), font=fl)

out_path = os.path.join(OUT_DIR, "mockups.png")
panel.save(out_path, "PNG", optimize=True)
print(f"✅ Mockups salvos em {out_path}")

# Salva individuais também
for label, scr in screens:
    fname = label.lower().replace(" ", "_").replace("ã","a").replace("é","e") + ".png"
    scr.save(os.path.join(OUT_DIR, fname))
    print(f"   {fname}")
