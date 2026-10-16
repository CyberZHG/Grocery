import random, sys
from PIL import Image
from gen_chars import char_row, random_look, Look
rnd = random.Random(1)
looks = [Look(hair='short', shirt='f4f0e8', pants='3a4a6a', apron='b83a3a', cap='b83a3a'),
         Look(hair='ponytail', shirt='e8e4dc', pants='2a2a34', apron='3a7a4a')]
for k in ['adult'] * 6 + ['kid', 'kid', 'elder', 'elder']:
    looks.append(random_look(rnd, k))
img = Image.new('RGBA', (9 * 34, len(looks) * 50), (120, 130, 120, 255))
for r, lk in enumerate(looks):
    for i, f in enumerate(char_row(lk)):
        f.to_image(img, i * 34, r * 50)
img.resize((img.width * 3, img.height * 3), Image.NEAREST).save(sys.argv[1])
