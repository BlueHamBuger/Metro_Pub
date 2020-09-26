import numpy as np
import json
from PIL import Image

# Image.new()
img = Image.new("RGB",(1024,1024))
jss = open("C:/Users/BlueBurger/Downloads/cuuee.json")
a = json.load(jss)
# img.putpixel(())
for i in range(1024):
    for j in range(1024):
        cur_pix = a[str(i*1024 + j)]
        img.putpixel((j,i),(cur_pix*30,0,0))

img.save("./cal.png")