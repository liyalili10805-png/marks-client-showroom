from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'output' / 'pdf'
OUT.mkdir(parents=True, exist_ok=True)
pdfmetrics.registerFont(TTFont('YaHei', r'C:\Windows\Fonts\msyh.ttc', subfontIndex=0))
pdfmetrics.registerFont(TTFont('YaHeiBold', r'C:\Windows\Fonts\msyhbd.ttc', subfontIndex=0))
W,H = A4
INK='#222323'; MUTED='#696b66'; LINE='#d8d8cf'; ACCENT='#a44a30'; PAPER='#faf9f5'
c = canvas.Canvas(str(OUT / 'Marks-推款需求确认.pdf'), pagesize=A4)
c.setTitle("Mark's 推款方向确认 | 致盛经理")
c.setAuthor('SOHO FASHION')

def text(x,y,s,size=11,color=INK,bold=False):
    c.setFillColor(HexColor(color)); c.setFont('YaHeiBold' if bold else 'YaHei',size); c.drawString(x,y,s)

def wrap(s,x,y,width=507,size=10.8,color=MUTED,leading=18):
    line=''
    for ch in s:
        if ch=='\n' or pdfmetrics.stringWidth(line+ch,'YaHei',size)>width:
            text(x,y,line,size,color); y-=leading; line='' if ch=='\n' else ch
        else: line+=ch
    if line: text(x,y,line,size,color); y-=leading
    return y

def rule(y):
    c.setStrokeColor(HexColor(LINE)); c.setLineWidth(.6); c.line(44,y,W-44,y)

def response(y,lines=2):
    for i in range(lines): rule(y-i*24)

def question(n,title,y):
    text(44,y,f'{n:02}',12,ACCENT,True); text(75,y,title,14,INK,True)

def header(page,title,subtitle):
    c.setFillColor(HexColor(PAPER)); c.rect(0,0,W,H,fill=1,stroke=0)
    text(44,H-43,'SOHO FASHION',10,INK,True); text(W-185,H-43,"MARK'S / 推款准备",9,MUTED)
    rule(H-56)
    text(44,H-99,title,26,INK,True)
    wrap(subtitle,44,H-128,size=10.5,width=507)
    text(44,33,'致盛经理 · 按编号微信回复即可，图片和资料可另发。',8.5,MUTED)
    text(W-77,33,f'{page} / 2',9,MUTED)

header(1,'这次，要推什么？','先按您目前对客户的了解回答即可。不确定的可留空，无需为填表额外做调研。')
question(1,'本次推款的方向与数量',H-196)
wrap('第一版暂按“都市通勤、简洁实用”做，这个方向是否合适？本次主要推哪些品类、季节？客户有明确要求或参考款吗？',44,H-224)
text(44,H-274,'预计首批数量：约                    款',11)
text(44,H-305,'重点方向 / 客户原话：',10.8,MUTED)
response(H-338,2)

question(2,'这批款式，希望用什么面料？',H-407)
wrap('款式页准备突出面料手感与特点。您希望重点推什么面料？客户对厚薄、成分或功能有要求吗？有没有不想用的面料？',44,H-435)
text(44,H-485,'有现成面料照片、样卡或参考款，可直接一起发。',10.5,ACCENT)
response(H-516,2)

question(3,'客户挑款时，最在乎哪几件事？',H-585)
wrap('网页会优先突出这些重点。请选最重要的 2-3 项，或补充客户实际说过的要求。',44,H-613)
labels=['价格','版型 / 穿着效果','舒适与手感','耐穿 / 易打理','面料或功能','颜色 / 风格','交期','其他']
for idx,label in enumerate(labels):
    x=44+(idx%4)*128; y=H-648-(idx//4)*27
    c.setStrokeColor(HexColor(MUTED)); c.rect(x,y-1,8,8,stroke=1,fill=0); text(x+15,y,label,9.4,INK)
response(H-714,1)
c.showPage()

header(2,'客户与门店，怎么说？','知道具体例子最有帮助。一两个款式、几句客户反馈，就能帮助我们调整页面和推荐重点。')
question(4,'客户现在最想解决的一个问题是什么？',H-196)
wrap('最近在推款、开发、面料或门店销售方面，客户反复提到什么困难或不满意的地方？',44,H-223)
response(H-273,2)

question(5,'门店目前哪些地方做得好？',H-337)
wrap('哪些款式或面料卖得好、反馈好？消费者喜欢它们的什么特点？有例子或图片最好。',44,H-365)
response(H-414,2)

question(6,'门店目前哪些地方需要改善？',H-478)
wrap('有没有不受欢迎的款式，或消费者常提的意见？例如版型、手感、颜色、价格等。不了解可留空。',44,H-506)
response(H-555,2)

question(7,'现有素材，以及可以展示的范围',H-619)
wrap('请提供首批款式的图片、款号和简短卖点；高清主图、上身图、细节图，有多少先发多少。',44,H-647)
wrap("建议先展示图片与卖点。这些款是否都适合给门店消费者看？如有暂时只给 Mark's 看的款式或信息，请标一下。",44,H-686)
response(H-733,1)
c.save()
print(OUT / 'Marks-推款需求确认.pdf')
