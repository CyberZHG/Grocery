import csv, sys
from PIL import Image
from gen_products import draw_product
rows = list(csv.DictReader(open('products.psv'), delimiter='|'))
cols = 20
img = Image.new('RGBA', (cols * 34, ((len(rows) + cols - 1) // cols) * 34), (90, 96, 110, 255))
for i, r in enumerate(rows):
    cv = draw_product(r['tpl'], r['a'], r['b'], r['c'])
    cv.to_image(img, (i % cols) * 34 + 1, (i // cols) * 34 + 1)
img = img.resize((img.width * 2, img.height * 2), Image.NEAREST)
img.save(sys.argv[1])
