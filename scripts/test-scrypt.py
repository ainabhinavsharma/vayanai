import hashlib, sqlite3

conn = sqlite3.connect('data/vayanai.db')
user = conn.execute("SELECT email, salt, password_hash FROM users WHERE email='contactus@vayanai.in.net'").fetchone()
email, salt, stored_hash = user
pwd = 'Gannu@12223'

# Test with salt as string or hex
calc_hash1 = hashlib.scrypt(pwd.encode('utf-8'), salt=salt.encode('utf-8'), n=16384, r=8, p=1, maxmem=0, dklen=64).hex()
calc_hash2 = hashlib.scrypt(pwd.encode('utf-8'), salt=bytes.fromhex(salt), n=16384, r=8, p=1, maxmem=0, dklen=64).hex()

print('Match with salt string:', calc_hash1 == stored_hash)
print('Match with salt bytes:', calc_hash2 == stored_hash)
print('Stored:', stored_hash[:20])
print('Calc1: ', calc_hash1[:20])
