// Mismo alfabeto que _shared/coaches.ts (Deno, lado bot): sin 0/O/1/l/I para
// que un coach pueda dictar o copiar el código a mano sin ambigüedad. Se
// reimplementa acá en vez de compartir código entre el runtime Deno de las
// Edge Functions y este proyecto Node — ver plan del panel para el porqué.
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 8;

export function generateInviteCodeString(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}
