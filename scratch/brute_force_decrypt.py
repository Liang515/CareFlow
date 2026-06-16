import sys

hex_data = "4a135942130b0000041d1343415e03120b0001001d134342130b00091d13425241130b09071d13545341130a07091d125c5041120b06064d"

def decrypt(hex_str, key):
    try:
        data_bytes = bytes.fromhex(hex_str)
        key_bytes = key.encode('utf-8')
        decrypted = bytearray()
        for i in range(len(data_bytes)):
            decrypted.append(data_bytes[i] ^ key_bytes[i % len(key_bytes)])
        return decrypted.decode('utf-8')
    except Exception as e:
        return None

# Try all 4-digit PINs from 0000 to 9999
for pin in range(10000):
    pin_str = f"{pin:04d}"
    decrypted = decrypt(hex_data, pin_str)
    if decrypted:
        # Check if it looks like valid JSON (starts with '{' and ends with '}')
        if decrypted.startswith('{') and decrypted.endswith('}'):
            print(f"Success! PIN: {pin_str}")
            print(f"Decrypted: {decrypted}")
            sys.exit(0)

print("No matching PIN found.")
