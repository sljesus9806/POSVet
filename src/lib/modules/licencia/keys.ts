// Llave pública de licencias, embebida en la app.
//
// Es PÚBLICA por diseño: solo sirve para VERIFICAR licencias, nunca para
// emitirlas. La llave privada correspondiente vive fuera del repo (.licencia/)
// y solo la usa el emisor (scripts/licencia / la futura plataforma).
//
// Puede sobreescribirse vía env `LICENCIA_PUBLIC_KEY` (con `\n` escapados) por
// si en el futuro rotas llaves sin recompilar.

const EMBEBIDA = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAsXfC9xDWowQjrKTIltQk4SV6ttc9TRwBKhhO/rlIwlM=
-----END PUBLIC KEY-----`;

export const LICENCIA_PUBLIC_KEY: string =
  process.env.LICENCIA_PUBLIC_KEY?.replace(/\\n/g, "\n") ?? EMBEBIDA;
