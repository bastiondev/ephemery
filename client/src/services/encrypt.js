// Symmetric passphrase encryption by:
// https://bradyjoslin.com/blog/encryption-webcrypto/

const buff_to_base64 = (buff) => {
  return btoa(String.fromCharCode.apply(null, buff));
}

const base64_to_buf = (b64) => {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(null));
}

const getPasswordKey = (passphrase) => {
  return window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
}

const deriveKey = (passwordKey, salt, keyUsage) => {
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 250000,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    keyUsage
  );
}

export async function encryptText(passphrase, text) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const passwordKey = await getPasswordKey(passphrase);
  const aesKey = await deriveKey(passwordKey, salt, ["encrypt"]);
  const encryptedContent = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    aesKey,
    new TextEncoder().encode(text)
  );
  const encryptedContentArr = new Uint8Array(encryptedContent);
  let buff = new Uint8Array(
    salt.byteLength + iv.byteLength + encryptedContentArr.byteLength
  );
  buff.set(salt, 0);
  buff.set(iv, salt.byteLength);
  buff.set(encryptedContentArr, salt.byteLength + iv.byteLength);
  const base64Buff = buff_to_base64(buff);
  return base64Buff;
}

export async function decryptText(passphrase, encryptedText) {
  const encryptedDataBuff = base64_to_buf(encryptedText);
  const salt = encryptedDataBuff.slice(0, 16);
  const iv = encryptedDataBuff.slice(16, 16 + 12);
  const data = encryptedDataBuff.slice(16 + 12);
  const passwordKey = await getPasswordKey(passphrase);
  const aesKey = await deriveKey(passwordKey, salt, ["decrypt"]);
  const decryptedContent = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    aesKey,
    data
  );
  return new TextDecoder().decode(decryptedContent);
}