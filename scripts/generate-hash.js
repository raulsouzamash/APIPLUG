/**
 * Script para gerar hash bcrypt da senha de acesso à aplicação.
 * Execute: node scripts/generate-hash.js SUA_SENHA_AQUI
 * Copie o hash gerado para a variável APP_PASSWORD_HASH na Vercel.
 */
const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.error('❌  Uso: node scripts/generate-hash.js SUA_SENHA_AQUI');
  process.exit(1);
}

if (password.length < 8) {
  console.error('❌  A senha deve ter pelo menos 8 caracteres.');
  process.exit(1);
}

const SALT_ROUNDS = 12;
console.log('\n⏳  Gerando hash (custo 12, pode levar alguns segundos)...\n');

bcrypt.hash(password, SALT_ROUNDS, (err, hash) => {
  if (err) {
    console.error('❌  Erro ao gerar hash:', err.message);
    process.exit(1);
  }
  console.log('✅  Hash gerado com sucesso!\n');
  console.log('Copie a linha abaixo para a variável APP_PASSWORD_HASH na Vercel:\n');
  console.log('  ' + hash);
  console.log('\n⚠️   Não compartilhe este hash. Não commitar no repositório.');
});
