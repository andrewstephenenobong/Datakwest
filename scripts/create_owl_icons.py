from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = root / "public" / "favicon(1).png"
out_dir = root / "public" / "icons"
out_dir.mkdir(parents=True, exist_ok=True)

source_image = Image.open(source).convert("RGBA")
for size, filename in ((192, "datakwest-owl-192.png"), (512, "datakwest-owl-512.png")):
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    image = source_image.copy()
    image.thumbnail((int(size * 0.86), int(size * 0.86)), Image.Resampling.LANCZOS)
    canvas.alpha_composite(image, ((size - image.width) // 2, (size - image.height) // 2))
    canvas.save(out_dir / filename, optimize=True)
