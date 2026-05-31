// Primitivas criptográficas de licencias (Ed25519, sin dependencias externas).
//
// Formato de token: JWS compacto `base64url(payload).base64url(firma)`.
// La firma se calcula sobre la cadena base64url del payload (el "mensaje"),
// de modo que la verificación es estable sin re-serializar el JSON.
//
// La llave privada SOLO se usa del lado del emisor (scripts/licencia). La copia
// del cliente únicamente verifica con la llave pública embebida (keys.ts).

import {
  generateKeyPairSync,
  sign as cryptoSign,
  verify as cryptoVerify,
  createPrivateKey,
  createPublicKey,
} from "node:crypto";

function b64urlEncode(buf: Buffer): string {
  return buf.toString("base64url");
}

function b64urlDecode(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

/** Genera un par de llaves Ed25519 en formato PEM. Uso de una sola vez. */
export function generarParLlaves(): {
  publicKeyPem: string;
  privateKeyPem: string;
} {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
    privateKeyPem: privateKey
      .export({ type: "pkcs8", format: "pem" })
      .toString(),
  };
}

/** Firma un payload arbitrario y devuelve el token compacto. */
export function firmarPayload(payload: unknown, privateKeyPem: string): string {
  const key = createPrivateKey(privateKeyPem);
  const msg = b64urlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  // Para Ed25519 el algoritmo de digest debe ser null (firma sobre el mensaje).
  const firma = cryptoSign(null, Buffer.from(msg, "utf8"), key);
  return `${msg}.${b64urlEncode(firma)}`;
}

/**
 * Verifica firma + integridad de un token. Devuelve el payload deserializado
 * si la firma es válida, o `null` si el formato/firma no cuadran. NO valida el
 * contenido del payload (eso lo hace el schema Zod en el service).
 */
export function verificarToken(
  token: string,
  publicKeyPem: string,
): unknown | null {
  const partes = token.split(".");
  if (partes.length !== 2) return null;
  const [msg, firmaB64] = partes;
  if (!msg || !firmaB64) return null;
  try {
    const key = createPublicKey(publicKeyPem);
    const ok = cryptoVerify(
      null,
      Buffer.from(msg, "utf8"),
      key,
      b64urlDecode(firmaB64),
    );
    if (!ok) return null;
    return JSON.parse(b64urlDecode(msg).toString("utf8"));
  } catch {
    return null;
  }
}
