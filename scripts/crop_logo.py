from PIL import Image, ImageChops

source = Image.open('/home/ubuntu/datakwest-audit/public/datakwest_icon_bg3.png').convert('RGBA')
alpha = source.getchannel('A')
bbox = alpha.getbbox()
if bbox is None:
    raise RuntimeError('Logo asset has no visible alpha bounds')
left, top, right, bottom = bbox
padding = 14
left = max(0, left - padding)
top = max(0, top - padding)
right = min(source.width, right + padding)
bottom = min(source.height, bottom + padding)
source.crop((left, top, right, bottom)).save('/home/ubuntu/datakwest-audit/public/datakwest_logo_lockup.png', optimize=True)
print((left, top, right, bottom))
