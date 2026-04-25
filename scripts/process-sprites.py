from PIL import Image
import numpy as np

SRC = "/root/.claude/uploads/02320042-dadb-437b-a1b7-39e80854c2e5"
DST = "/home/user/ClaudeTestRepo/public/assets/sprites"
FW, FH, ROWS = 138, 111, 8

sheets = {
    "char_walk":  ("019dc2cf-CharWalk.png",  14),
    "char_atk":   ("019dc2cf-CharAtk.png",   14),
    "char_death": ("019dc2cf-CharDeath.png",  11),
    "char_block": ("019dc2d0-CharBlock.png",  10),
}

for out_name, (src_file, cols) in sheets.items():
    img = Image.open(f"{SRC}/{src_file}").convert("RGBA")
    data = np.array(img)
    r, g, b = data[:, :, 0], data[:, :, 1], data[:, :, 2]
    white = (r > 230) & (g > 230) & (b > 230)
    data[white, 3] = 0
    cropped = data[:ROWS * FH, :cols * FW, :]
    Image.fromarray(cropped, 'RGBA').save(f"{DST}/{out_name}.png")
    print(f"{out_name}.png: {cols * FW}x{ROWS * FH}")
