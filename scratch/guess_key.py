import json

hex_data = "4a135942130b0000041d1343415e03120b0001001d134342130b00091d13425241130b09071d13545341130a07091d125c5041120b06064d"
data_bytes = bytes.fromhex(hex_data)

# Let's guess the key byte by byte
# Since we know the plain text starts with '{"hr":' or similar
known_plain = '{"hr":'
key = []
for i in range(len(known_plain)):
    key.append(data_bytes[i] ^ ord(known_plain[i]))

print("Guessed key prefix:", key)
# Convert guessed key to characters if possible
chars = []
for k in key:
    if 32 <= k <= 126:
        chars.append(chr(k))
    else:
        chars.append(f"\\x{k:02x}")
print("Guessed key chars:", "".join(chars))
