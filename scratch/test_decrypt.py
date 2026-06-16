hex_data = "4a135942130b0000041d1343415e03120b0001001d134342130b00091d13425241130b09071d13545341130a07091d125c5041120b06064d"
data_bytes = bytes.fromhex(hex_data)
key_bytes = "1110".encode('utf-8')

decrypted = bytearray()
for i in range(len(data_bytes)):
    decrypted.append(data_bytes[i] ^ key_bytes[i % len(key_bytes)])

print(decrypted.decode('utf-8'))
