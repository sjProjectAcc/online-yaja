import os, math, json, zipfile
import numpy as np
import trimesh
from PIL import Image,ImageDraw,ImageFont
from collections import defaultdict

OUT='/mnt/data/Ara_Student_Avatar_LowPoly'
os.makedirs(OUT,exist_ok=True)

COL={
 'skin':'#F1C6A8','skin_shadow':'#DFA989','cheek':'#E9A9A1',
 'hair':'#37302F','hair_dark':'#282426','hair_light':'#49403D',
 'eyes':'#181B21','eye_shine':'#FDFBF9',
 'navy':'#242B3E','navy_light':'#2E374C','navy_dark':'#1A2233',
 'sport':'#222A38','sport_light':'#2B3545','sport_dark':'#161E29',
 'blue':'#78C9F5','blue_light':'#A9E4FF', 'white':'#F6F7F8','offwhite':'#E8ECEF',
 'slacks':'#555962','slacks_light':'#636773','slacks_dark':'#434852',
 'hoodie':'#ABB0BA','hoodie_light':'#C2C6CE', 'hoodie_dark':'#9097A3',
 'gold':'#D6B267','plaid':'#B8A879','plaid_light':'#ECE6CF', 'button':'#CBD0DA',
 'shoe':'#F5F5F3','shoe_shadow':'#CFD2D7','shoe_sole':'#E2E4E7',
 'stripe_white':'#F6F7F7',
}
def rgba(name):
    h=COL.get(name,name).lstrip('#')
    rgb=[int(h[i:i+2],16) for i in (0,2,4)]
    return np.array(rgb+[255],dtype=np.uint8)

def apply_color(m,color):
    m.visual.face_colors=np.tile(rgba(color),(len(m.faces),1))
    return m

def mk_box(center,extents,color):
    m=trimesh.creation.box(extents=extents);m.apply_translation(center);return apply_color(m,color)

def ico(center,radii,color,subdiv=1):
    m=trimesh.creation.icosphere(subdivisions=subdiv,radius=1)
    m.apply_scale(radii);m.apply_translation(center)
    return apply_color(m,color)

def ring_solid(section,color,n=10,phase=math.pi/4):
    # Section list: (height, radius x, radius z, center z)
    vertices=[]
    for y,rx,rz,cz in section:
        for j in range(n):
            a=2*math.pi*j/n + phase
            co,si=math.cos(a), math.sin(a)
            # slight squircle, boxier than a circle
            s=1/(max(abs(co),abs(si))**.25)
            vertices.append([rx*co*s,y,cz+rz*si*s])
    vertices.extend([[0,section[0][0],section[0][3]],[0,section[-1][0],section[-1][3]]])
    faces=[]
    for k in range(len(section)-1):
        for j in range(n):
            a=k*n+j;b=k*n+(j+1)%n;c=(k+1)*n+j;d=(k+1)*n+(j+1)%n
            faces.extend([[a,b,c],[b,d,c]])
    for j in range(n):
        faces.append([len(vertices)-2,(j+1)%n,j])
        faces.append([len(vertices)-1,(len(section)-1)*n+j,(len(section)-1)*n+(j+1)%n])
    return apply_color(trimesh.Trimesh(vertices=vertices,faces=faces,process=False),color)

def cyl_between(a,b,r0,r1,color,n=8):
    a=np.asarray(a,float); b=np.asarray(b,float)
    direction=b-a;length=np.linalg.norm(direction)
    axis=direction/length
    u=np.cross(axis,[0,0,1.0])
    if np.linalg.norm(u)<1e-5: u=np.cross(axis,[0,1,0])
    u/=np.linalg.norm(u); v=np.cross(axis,u)
    vs=[]
    for p,r in [(a,r0),(b,r1)]:
        for j in range(n):
            angle=2*math.pi*j/n
            vs.append(p + r*(u*math.cos(angle)+v*math.sin(angle)))
    faces=[]
    for j in range(n):
        nxt=(j+1)%n
        faces.extend([[j,nxt,n+j],[nxt,n+nxt,n+j]])
    vs.extend([a,b]);
    for j in range(n):
        faces.extend([[2*n,(j+1)%n,j],[2*n+1,n+j,n+(j+1)%n]])
    return apply_color(trimesh.Trimesh(vertices=np.array(vs),faces=faces,process=False),color)

def poly(points,color,z_offset=0,thickness=.002):
    # Convex polygon 3D face, +Z front, with optional skin as surface.
    pts=np.array(points,dtype=float); pts[:,2]+=z_offset
    c=pts.mean(axis=0)
    v=np.vstack((pts,c))
    center=len(pts)
    faces=[]
    for j in range(len(pts)):
        faces.append([center,j,(j+1)%len(pts)])
    return apply_color(trimesh.Trimesh(vertices=v,faces=faces,process=False),color)

def line(points,r,color,sides=5):
    meshes=[]
    for a,b in zip(points,points[1:]):
        if np.linalg.norm(np.asarray(a)-np.asarray(b))>1e-6:
            meshes.append(cyl_between(a,b,r,r,color,n=sides))
    return meshes

PARTS={}
def add(part,name,mesh):
    slot=PARTS.setdefault(part,{}).setdefault(name,[])
    if isinstance(mesh,list): slot.extend(mesh)
    else: slot.append(mesh)

def torso(part,color,sections=None):
    sections=sections or [(0.697,.137,.087,0),(0.735,.157,.096,0),(.85,.177,.101,0),(.944,.19,.102,0),(.99,.118,.085,0)]
    add(part,'Torso',ring_solid(sections,color,n=12))

def limb_top(part,mode='long',color='navy'):
    for side,label in [(-1,'R'),(1,'L')]:
        shoulder=(side*.166,.941,.0)
        elbow=(side*.242,.815,.014)
        wrist=(side*.323,.677,.036)
        if mode=='short':
            sleeve_end=(side*.228,.841,.012)
            add(part,'Sleeve_'+label,cyl_between(shoulder,sleeve_end,.067,.061,color,n=8))
            add(part,'Sleeve_'+label,cyl_between(sleeve_end,(side*.235,.83,.015),.063,.060,'sport_light',n=8))
            add(part,'Forearm_'+label,cyl_between((side*.239,.828,.015),elbow,.045,.042,'skin',n=8))
            add(part,'Forearm_'+label,cyl_between(elbow,wrist,.042,.036,'skin',n=8))
        else:
            add(part,'Sleeve_'+label,cyl_between(shoulder,elbow,.069,.056,color,n=8))
            add(part,'Sleeve_'+label,cyl_between(elbow,wrist,.056,.046,color,n=8))
            add(part,'Cuff_'+label,cyl_between((side*.315,.692,.032),(side*.330,.665,.037),.048,.047, 'navy_dark' if color=='navy' else ('sport_dark' if color in ('sport','sport_light') else ('hoodie_dark' if color=='hoodie' else 'offwhite')),n=8))
    return

def add_hand_core():
    for side,label in [(-1,'R'),(1,'L')]:
        add('core','Hand_'+label,ico((side*.341,.620,.043),(.045,.064,.045),'skin',1))
        add('core','Hand_'+label,ico((side*.314,.605,.065),(.020,.033,.020),'skin',1))

def head_core():
    p='core'
    add(p,'Neck',cyl_between((0,.992,0),(0,1.075,0),.058,.058,'skin',10))
    # faceted friendly face, slightly angular cheeks
    head=ico((0,1.193,0),(.169,.176,.146),'skin',2)
    add(p,'Head',head)
    add(p,'Chin',ico((0,1.105,.025),(.116,.075,.112),'skin',1))
    for side,label in [(-1,'R'),(1,'L')]:
        add(p,'Ears',ico((side*.165,1.170,-.005),(.035,.047,.033),'skin',1))
        # eyes nearly flush on face, tilted outward very slightly
        add(p,'Face',mk_box((side*.062,1.184,.150),(.019,.051,.007),'eyes'))
        add(p,'Face',mk_box((side*.058,1.198,.156),(.005,.012,.002),'eye_shine'))
        add(p,'Face',ico((side*.118,1.137,.128),(.031,.013,.005),'cheek',1))
    # tiny nose + subtle mouth only
    add(p,'Face',ico((0,1.122,.150),(.012,.012,.008),'skin_shadow',1))
    add(p,'Face',mk_box((0,1.092,.145),(.025,.004,.004),'skin_shadow'))
    # angular back/sides hair cap ring section; varying y by angle for shorter forehead, longer back
    n=16
    # Ring radii chosen to sit fully OUTSIDE the facial scalp, avoiding exposed patches.
    levels=[(1.00,0.00), (1.025,.35), (.88,.70), (.52,.94), (.22,1.00)]
    verts=[]
    for rad,progress in levels:
        for j in range(n):
            a=2*math.pi*j/n
            front=max(0,math.sin(a));back=max(0,-math.sin(a))
            base=1.237+.017*front-.068*back
            y=base*(1-progress)+1.423*progress
            radx=.178*rad
            radz=.158*rad
            verts.append([radx*math.cos(a),y,-.010+radz*math.sin(a)])
    faces=[]
    for k in range(len(levels)-1):
        for j in range(n):
            a=k*n+j;b=k*n+(j+1)%n;c=(k+1)*n+j;d=(k+1)*n+(j+1)%n
            faces.extend([[a,c,b],[b,c,d]])
    verts.append([0,1.438,-.010]);top=len(verts)-1
    for j in range(n):
        faces.append([top,(len(levels)-1)*n+j,(len(levels)-1)*n+(j+1)%n])
    hair=trimesh.Trimesh(vertices=verts,faces=faces,process=False)
    add(p,'HairCap',apply_color(hair,'hair'))
    # hair locks over forehead, triangular angular tufts
    tipx=[-.139,-.100,-.054,-.011,.044,.095,.143]
    tipy=[1.214,1.180,1.226,1.190,1.213,1.182,1.231]
    for i,(x,yt) in enumerate(zip(tipx,tipy)):
        w=.044 if i in (0,6) else .052
        points=[[x-w*.7,1.310,.113],[x+w*.7,1.309,.116],[x,yt,.150]]
        add(p,'HairFringe',poly(points,'hair_dark' if i%3==0 else 'hair',z_offset=0))
        add(p,'HairFringe',poly([[x-w*.48,1.311,.116],[x,yt+.03,.150],[x+.003,1.310,.118]],'hair_light',0))
    # back side locks near ears
    for side in [-1,1]:
        add(p,'HairSide',ico((side*.153,1.243,-.057),(.033,.065,.050),'hair',1))

def shoes_core():
    for side,label in [(-1,'R'),(1,'L')]:
        x=side*.094
        add('core','Shoe_'+label,ring_solid([(.017,.071,.105,.046),(.035,.071,.105,.049),(.104,.064,.092,.028),(.124,.051,.074,.012)],'shoe',n=8))
        sole=ring_solid([(.005,.081,.123,.057),(.034,.081,.123,.057)],'shoe_sole',n=10)
        sole.apply_translation([x,0,0])
        add('core','Shoe_'+label,sole)
        # correction previous ring is at x=0, shift it!
        part=PARTS['core']['Shoe_'+label]
        part[-2].apply_translation([x,0,0]);
        add('core','Shoe_'+label,mk_box((x,.062,.142),(.133,.018,.021),'shoe_shadow'))
        for k in range(3):
            add('core','Shoe_'+label,mk_box((x,.084-k*.015,.103-k*.017),(.075,.006,.007),'offwhite'))

# shirt shared visible details
def shirt_neck(part,show_full=True):
    # both collar flaps visible above lapel/hood
    for s in [-1,1]:
        add(part,'ShirtCollar',poly([[s*.026,1.005,.096],[s*.102,.994,.097],[s*.046,.928,.123]],'white'))
        add(part,'ShirtCollar',poly([[s*.04,.996,.105],[s*.078,.983,.109],[s*.048,.946,.125]],'offwhite'))
    if show_full:
        add(part,'ShirtFront',mk_box((0,.857,.105),(.065,.257,.009),'white'))
        for y in [.954,.904,.855,.805,.756]:
            add(part,'Buttons',ico((0,y,.113),(.004,.004,.003),'button',1))

def tie(part):
    add(part,'Tie',poly([[-.019,.963,.121],[.019,.963,.121],[.013,.93,.13],[-.014,.93,.13]],'navy_dark'))
    add(part,'Tie',poly([[-.011,.926,.131],[.011,.926,.131],[.028,.814,.128],[0,.791,.128],[-.022,.817,.128]],'navy_light'))
    add(part,'Tie',line([[.003,.910,.135],[.010,.897,.134]],.0025,'blue'))

def shirt():
    p='top_shirt'
    torso(p,'white')
    limb_top(p,'long','white')
    shirt_neck(p,False)
    # center seam down the front
    add(p,'Seam',line([[0,.942,.111],[0,.734,.112]],.0016,'offwhite'))
    for y in [.918,.868,.818,.768,.739]:add(p,'Buttons',ico((0,y,.115),(.004,.004,.003),'button',1))
    add(p,'Pocket',poly([[.09,.89,.102],[.146,.89,.094],[.139,.831,.107],[.096,.832,.113]],'offwhite'))

def hoodie():
    p='top_hoodie'; torso(p,'hoodie',[(.69,.153,.102,0),(.75,.166,.109,0),(.87,.182,.119,0),(.955,.186,.114,0),(1.005,.129,.091,0)])
    limb_top(p,'long','hoodie')
    # shirt collar underneath hoodie
    shirt_neck(p,False)
    # back rolled hood as collar, sides and fold
    add(p,'Hood',ring_solid([(1.010,.095,.079,-.075),(1.050,.137,.075,-.066),(1.103,.120,.060,-.073),(1.126,.067,.052,-.075)],'hoodie',n=10))
    add(p,'HoodSeam',line([[-.113,1.057,-.019],[-.080,1.032,.083]],.006,'hoodie_dark'))
    add(p,'HoodSeam',line([[.113,1.057,-.019],[.080,1.032,.083]],.006,'hoodie_dark'))
    # kangaroo pocket
    add(p,'Pocket',poly([[-.113,.782,.114],[.113,.782,.114],[.102,.719,.113],[-.104,.719,.113]],'hoodie_light'))
    add(p,'Pocket',line([[-.111,.780,.118],[-.074,.740,.117]],.002,'hoodie_dark'))
    add(p,'Pocket',line([[.111,.780,.118],[.074,.740,.117]],.002,'hoodie_dark'))
    for s in [-1,1]:
        add(p,'Strings',line([[s*.035,1.002,.117],[s*.038,.914,.124]],.004,'white'))
    add(p,'Hem',ring_solid([(.688,.153,.102,0),(.707,.155,.102,0)],'hoodie_dark',12))

def blazer():
    p='top_blazer';torso(p,'navy')
    limb_top(p,'long','navy')
    # central white V with tie; shirt on top of blazer
    add(p,'WhiteInset',poly([[-.085,.99,.103],[.085,.99,.103],[.039,.829,.115],[-.036,.829,.115]],'white'))
    shirt_neck(p,False);tie(p)
    # collar slightly raised on back and lapels front
    for s in [-1,1]:
        add(p,'Lapel',poly([[s*.045,1.002,.102],[s*.129,.968,.092],[s*.066,.867,.12],[s*.035,.918,.122]],'navy_light'))
        # plaid-trim gold and pale strip forming lapel edge
        add(p,'LapelTrim',line([[s*.126,.972,.100],[s*.064,.876,.127],[s*.034,.922,.129]],.006,'plaid'))
        add(p,'LapelTrim',line([[s*.119,.966,.103],[s*.061,.879,.129],[s*.030,.920,.132]],.0024,'plaid_light'))
        for i in range(3):
            x=s*(.116-.02*i); y=.955-.032*i
            add(p,'LapelPlaid',line([[x,y,.111],[x-s*.016,y-.003,.119]],.0016,'plaid_light'))
        # pocket flaps
        add(p,'Pocket',poly([[s*.069,.787,.105],[s*.162,.787,.090],[s*.154,.760,.102],[s*.075,.76,.114]],'navy_light'))
        add(p,'PocketTrim',line([[s*.070,.784,.112],[s*.155,.785,.097]],.003,'plaid'))
    # single-breasted jacket closure and buttons
    for y in [.853,.778,.712]:
        add(p,'GoldButtons',ico((.025,y,.114),(.010,.010,.004),'gold',1))
    add(p,'JacketSeam',line([[.022,.872,.113],[.022,.699,.097]],.0016,'navy_dark'))
    # crest sky blue circular emblem, front left chest (positive x)
    circle=ico((.122,.903,.107),(.019,.019,.004),'blue',2)
    add(p,'Crest',circle)
    add(p,'Crest',ico((.122,.903,.113),(.013,.013,.0015),'white',1))
    add(p,'Crest',line([[.119,.897,.117],[.124,.906,.117],[.131,.893,.117]],.002,'blue'))
    # back collar band
    add(p,'BackCollar',ring_solid([(.997,.099,.078,-.018),(1.015,.103,.076,-.019)],'navy_dark',10))

def word_ara(part,x=.062,y=.898,z=.124):
    # Raster-to-mesh lettering: genuine lowercase "ara" glyph silhouette,
    # entirely geometry (not a separate texture), one sky-blue material.
    path='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    font=ImageFont.truetype(path,47)
    bg=Image.new('L',(140,70),0)
    draw=ImageDraw.Draw(bg)
    draw.text((4,-3),'ara',fill=255,font=font,stroke_width=0)
    bb=bg.getbbox()
    mask=bg.crop(bb).resize((42,17),Image.Resampling.LANCZOS)
    arr=np.asarray(mask)>110
    dx=.066/42;dy=.026/17
    for row in range(arr.shape[0]):
        j=0
        while j<arr.shape[1]:
            if not arr[row,j]:
                j+=1;continue
            start=j
            while j<arr.shape[1] and arr[row,j]:j+=1
            x0=x+start*dx;x1=x+j*dx
            y0=y+(arr.shape[0]-1-row)*dy
            y1=y0+dy
            add(part,'ARA_Logo',poly([[x0,y0,z],[x1,y0,z],[x1,y1,z],[x0,y1,z]],'blue'))

def stripes_upper(part,mode='long'):
    for s,label in [(-1,'R'),(1,'L')]:
        # pair of parallel lines along the upper-front of the sleeves and shoulder
        for idx,(delta,c) in enumerate([(-.013,'blue'),(.013,'stripe_white')]):
            if mode=='short':
                pts=[[s*.145 + s*delta,.976,.090],[s*.193+s*delta,.922,.076],[s*.223+s*delta,.855,.067]]
            else:
                pts=[[s*.145+s*delta,.978,.085],[s*.196+s*delta,.917,.073],[s*.242+s*delta,.805,.068],[s*.315+s*delta,.688,.069]]
            for t in line(pts,.0052,c,6):add(part,'DoubleStripe_'+label,t)

def track_jacket():
    p='top_track_jacket';torso(p,'sport',[(.69,.145,.100,0),(.73,.163,.103,0),(.85,.179,.108,0),(.953,.185,.109,0),(1.00,.119,.092,0)])
    limb_top(p,'long','sport');stripes_upper(p)
    # high stand collar + zip
    add(p,'Collar',ring_solid([(.988,.084,.075,0),(1.055,.093,.080,0)],'sport_dark',n=12))
    add(p,'Zip',line([[0,1.052,.081],[0,.695,.110]],.0030,'shoe_shadow'))
    add(p,'ZipPull',mk_box((0,.941,.114),(.009,.016,.006),'shoe'))
    for s in [-1,1]:
        add(p,'Pocket',line([[s*.087,.765,.115],[s*.15,.805,.098]],.0026,'sport_light'))
    add(p,'Hem',ring_solid([(.682,.145,.100,0),(.706,.147,.101,0)],'sport_dark',12))
    word_ara(p,x=.062,y=.898,z=.124)

def sports_tshirt():
    p='top_sports_tshirt';torso(p,'sport',[(.696,.144,.099,0),(.745,.155,.102,0),(.859,.177,.107,0),(.95,.182,.106,0),(.994,.103,.084,0)])
    limb_top(p,'short','sport');stripes_upper(p,mode='short')
    add(p,'NeckBand',ring_solid([(.991,.073,.065,0),(1.009,.078,.070,0)],'white',10))
    add(p,'Hem',ring_solid([(.693,.143,.099,0),(.706,.145,.099,0)],'sport_dark',10))
    word_ara(p,x=.062,y=.898,z=.124)

def legs(part,kind='uniform'):
    is_short = kind=='shorts'
    col = 'slacks' if kind=='uniform' else 'sport'
    col_light='slacks_light' if kind=='uniform' else 'sport_light'
    col_dark='slacks_dark' if kind=='uniform' else 'sport_dark'
    add(part,'Waist',ring_solid([(.638,.153,.091,0),(.704,.142,.090,0)],col,n=12))
    if kind=='uniform':
        add(part,'Belt',ring_solid([(.675,.146,.096,0),(.685,.146,.096,0)],'slacks_dark',12))
        add(part,'BeltBuckle',mk_box((0,.681,.102),(.030,.015,.006),'gold'))
    for s,label in [(-1,'R'),(1,'L')]:
        x=s*.088
        if is_short:
            verts=[(.480,.094,.073),(.535,.099,.073),(.637,.09,.08)]
            section=[(.455,.096,.069,0),(.53,.096,.071,0),(.655,.092,.078,0)]
        else:
            section=[(.114,.073,.075,.008),(.180,.074,.076,0),(.52,.087,.077,0),(.655,.090,.080,0)]
        lg=ring_solid(section,col,n=10)
        lg.apply_translation([x,0,0]);add(part,'Leg_'+label,lg)
        if is_short:
            add(part,'Hem_'+label,ring_solid([(.446,.098,.070,0),(.462,.098,.070,0)],col_dark,10))
            # move last hem to correct x
            PARTS[part]['Hem_'+label][-1].apply_translation([x,0,0])
            # exposed knees, shins. ankle to shoe
            sleg=ring_solid([(.107,.061,.058,0),(.135,.061,.059,0),(.30,.070,.062,0),(.463,.079,.065,0)],'skin',n=9)
            sleg.apply_translation([x,0,0]);add(part,'BareLeg_'+label,sleg)
            add(part,'Knee_'+label,ico((x,.296,.006),(.060,.052,.046),'skin',1))
        if kind=='track' or is_short:
            # long vertical double stripes near visible outward face on front
            xside=x+s*(.072 if not is_short else .078)
            pts_y=[(.635,.071),(.535,.070),(.455,.064)] if is_short else [(.640,.070),(.515,.066),(.240,.062),(.132,.066)]
            for shift,color in [(-s*.014,'blue'),(s*.014,'stripe_white')]:
                points=[[xside+shift, yy, zz] for yy,zz in pts_y]
                for t in line(points,.0052,color,6):add(part,'Stripe_'+label,t)
        else:
            add(part,'TrouserCrease',line([[x,.602,.082],[x,.175,.082]],.0012,'slacks_light'))
    if kind=='track':
        add(part,'ElasticWaist',ring_solid([(.665,.145,.096,0),(.681,.144,.095,0)],'sport_dark',12))

head_core();add_hand_core();shoes_core()
shirt();hoodie();blazer();track_jacket();sports_tshirt()
legs('bottom_uniform','uniform');legs('bottom_track','track');legs('bottom_shorts','shorts')

def assemble(parts,filename):
    scene=trimesh.Scene()
    polycount=0; meshcount=0
    for part in parts:
        for node,geoms in PARTS[part].items():
            m=trimesh.util.concatenate(geoms)
            # vertex colors from face colors if merging distinct shades
            if not isinstance(m.visual,trimesh.visual.ColorVisuals):
                m.visual=trimesh.visual.ColorVisuals(mesh=m,face_colors=np.tile([255,255,255,255],(len(m.faces),1)))
            scene.add_geometry(m,node_name=f'{part}_{node}',geom_name=f'{part}_{node}')
            polycount+=len(m.faces);meshcount+=1
    scene.export(os.path.join(OUT,filename))
    return {'file':filename,'triangles':polycount,'mesh_groups':meshcount,'parts':parts}

summary=[]
for p in PARTS:
    summary.append(assemble([p],p+'.glb'))
for name,parts in [
 ('preset_school_uniform',['core','top_blazer','bottom_uniform']),
 ('preset_shirt_uniform',['core','top_shirt','bottom_uniform']),
 ('preset_hoodie_uniform',['core','top_hoodie','bottom_uniform']),
 ('preset_sports_winter',['core','top_track_jacket','bottom_track']),
 ('preset_sports_summer',['core','top_sports_tshirt','bottom_shorts'])]:
    summary.append(assemble(parts,name+'.glb'))

with open(os.path.join(OUT,'model_manifest.json'),'w',encoding='utf8') as f:
    json.dump({'coordinate_system':'Y up, +Z front, meters','pose':'neutral A-pose; not skinned / no animations','assembly':{'core':'core.glb','tops':['top_shirt.glb','top_hoodie.glb','top_blazer.glb','top_track_jacket.glb','top_sports_tshirt.glb'],'bottoms':['bottom_uniform.glb','bottom_track.glb','bottom_shorts.glb']},'files':summary,'textures':'vertex colors; no external image textures'},f,ensure_ascii=False,indent=2)
print(json.dumps(summary,indent=2))
